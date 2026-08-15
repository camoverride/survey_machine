import io
import json
import logging
import os
from PIL import Image
import subprocess
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
import requests
from flask import Flask, jsonify, render_template, request



# Config.
HOST = "0.0.0.0"
PORT = 5000
DRAWING_SCALE = 0.2
REMOTE_URL = "http://100.116.247.74:5000/image"
DEBUG_SUBMISSION_DIR = Path("debug_submissions")
REMOTE_TIMEOUT = (3, 10) # (connect, read)


# Set up logging.
logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s "
        "%(levelname)s "
        "%(message)s"))

logger = logging.getLogger(__name__)


# Set up app.
app = Flask(
    __name__,
    static_folder="static",
    template_folder="static")


# Create debug submission directory.
DEBUG_SUBMISSION_DIR.mkdir(
    parents=True,
    exist_ok=True)


def prepare_remote_files(
    file_data: dict
) -> dict:
    """
    Convert locally-read file bytes into the structure
    requests.post(files=...) expects.
    """
    remote_files = {}

    # Add each uploaded image to the remote request.
    for field_name in (
        "name",
        "story",
        "drawing"):

        data = file_data.get(
            field_name)

        # Skip missing files.
        if data is None:
            continue

        # Format the file for requests.post().
        remote_files[field_name] = (
            f"{field_name}.png",
            io.BytesIO(data),
            "image/png")

    return remote_files


def upload_to_remote_server(
    survey_data: dict,
    file_data: dict
) -> None:
    """
    Send the submission to the remote server.

    This runs in a background thread so the kiosk does not
    have to wait for the remote server.
    """
    try:
        logger.info(
            "Uploading submission to remote server.")

        # Convert survey data to JSON for the remote request.
        survey_json = json.dumps(
            survey_data)

        # Open the original drawing.
        image = Image.open(
            io.BytesIO(file_data["drawing"]))

        # Shrink the drawing before sending it.
        image = image.resize((
            int(image.width * DRAWING_SCALE),
            int(image.height * DRAWING_SCALE)))

        # Convert the resized drawing back into PNG bytes.
        output = io.BytesIO()
        image.save(output, format="PNG")
        file_data["drawing"] = output.getvalue()

        # Prepare uploaded files for requests.post().
        files = (prepare_remote_files(file_data))

        logger.info("Uploading to: %s", REMOTE_URL)

        # Send the survey and images to the remote server.
        response = requests.post(
            REMOTE_URL,
            data={
                "survey": survey_json},
            files=files,
            timeout=REMOTE_TIMEOUT )

        # Log the remote server response.
        logger.info("Response status code: %s", response.status_code)
        logger.info("Response body: %s", response.text[:500])

    # Log errors.
    except requests.RequestException as error:
        logger.error("Remote submission failed: %s", error)

    except Exception as error:
        logger.error("Unexpected error uploading submission: %s", error)


# Home page route.
@app.route("/")
def index():
    return render_template(
        "index.html")


# Submit survey data.
@app.route(
    "/submit",
    methods=["POST"])
def submit():

    logger.info("Received submission.")

    # Get survey JSON from the form.
    survey_string = request.form.get("survey", "{}")

    try:
        # Parse the survey JSON.
        survey_data = json.loads(survey_string)

    except json.JSONDecodeError:
        logger.warning("Invalid survey JSON.")

        return jsonify({
            "success": False,
            "error": "Invalid survey JSON."}), 400

    # Create a unique directory for this submission.
    timestamp = datetime.now().strftime(
        "%Y-%m-%d_%H-%M-%S")

    submission_id = (
        f"{timestamp}_"
        f"{uuid.uuid4().hex[:6]}")

    submission_dir = (
        DEBUG_SUBMISSION_DIR /
        submission_id)

    submission_dir.mkdir(
        parents=True,
        exist_ok=False)

    logger.info(
        "Submission ID: %s",
        submission_id)

    # Collect uploaded files.
    file_data = {}

    for field_name in (
        "name",
        "story",
        "drawing"):

        # Get the uploaded file from the request.
        uploaded_file = request.files.get(
            field_name)

        # Skip missing files.
        if uploaded_file is None:
            logger.warning(
                "Submission missing: %s",
                field_name)

            continue

        # Read the uploaded file into memory.
        file_data[field_name] = (
            uploaded_file.read())

    # Save survey data locally for debugging.
    survey_path = (submission_dir /"survey.json")

    with survey_path.open(
        "w",
        encoding="utf-8") as file:

        json.dump(
            survey_data,
            file,
            indent=2,
            ensure_ascii=False)

    # Save uploaded files locally for debugging.
    for field_name, data in file_data.items():
        image_path = (submission_dir / f"{field_name}.png")

        image_path.write_bytes(data)

    logger.info(
        "Local debug copy saved: %s",
        submission_dir)

    # Use a thread to upload in the background.
    upload_thread = threading.Thread(
        target=upload_to_remote_server,
        args=(
            survey_data,
            file_data),
        daemon=True)

    upload_thread.start()

    # Immediately tell the kiosk the submission was received.
    return jsonify({
        "success": True,
        "submission_id": submission_id})



if __name__ == "__main__":

    # Access and rotate screen.
    try:
        # Give the desktop environment time to start.
        time.sleep(10)

        # Set the X display.
        os.system("export DISPLAY=:0")

        # Set the X authentication file.
        os.system(
            "export XAUTHORITY=$(find /run/user/1000 "
            "-maxdepth 1 -name '.mutter-Xwaylandauth.*' "
            "-print -quit)")

        # Give the display environment time to initialize.
        time.sleep(1)

        # Rotate the kiosk display.
        os.system("./gnome-randr.py --output eDP-1 --rotate left")

    except Exception as error:
        logger.info("Failed to rotate screen.")
        logger.info(error)

    # Open a web browser
    subprocess.Popen([
        "firefox",
        "--kiosk",
        "http://127.0.0.1:5000"
    ])
    time.sleep(3)


    # Run the app!
    logger.info("Starting survey app.")

    app.run(
        host=HOST,
        port=PORT,
        debug=False,
        threaded=True)
