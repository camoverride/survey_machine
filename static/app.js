"use strict";

const monitor_url = "/submit";


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let currentPage = "start";

let submitTimer = null;

let surveyData = {
    name: "",
    relationship: "",
    frequency: "",
    favorite: "",
    improve: "",
    story: null
};

let currentPrompt = "";

let nameContext = null;
let storyContext = null;
let drawingContext = null;


/* =========================================================
   PROMPTS
   ========================================================= */

const prompts = [
    "Draw something you want in SLU",
    "Draw your favorite place in SLU",
    "Draw something in SLU that makes you happy",
    "Draw what comes to mind when you hear 'SLU'"
];


function choosePrompt() {

    if (prompts.length === 1) {
        return prompts[0];
    }

    let newPrompt;

    do {
        newPrompt =
            prompts[
                Math.floor(
                    Math.random() * prompts.length
                )
            ];
    }
    while (newPrompt === currentPrompt);

    return newPrompt;
}


function updatePrompt() {

    currentPrompt = choosePrompt();

    const promptElement =
        document.getElementById(
            "drawing-prompt"
        );

    if (promptElement) {
        promptElement.textContent =
            currentPrompt;
    }
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(name) {

    console.log("Showing page:", name);

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });

    const page =
        document.getElementById(
            "page-" + name
        );

    if (!page) {

        console.error(
            "Page does not exist:",
            "page-" + name
        );

        return;
    }

    page.classList.add("active");

    currentPage = name;

    /*
     * Wait one browser rendering cycle before
     * measuring/initializing canvases.
     */

    requestAnimationFrame(() => {

        if (name === "name") {
            initializeNamePage();
        }

        if (name === "story") {
            initializeStoryPage();
        }

        if (name === "drawing") {
            initializeDrawingPage();
        }

    });
}


/* =========================================================
   CANVAS SETUP
   ========================================================= */

function setupCanvas(canvas) {

    if (!canvas) {

        console.error(
            "Canvas element not found."
        );

        return null;
    }

    const rect =
        canvas.getBoundingClientRect();

    console.log(
        "Canvas size:",
        rect.width,
        rect.height
    );

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {

        console.error(
            "Canvas has zero dimensions."
        );

        return null;
    }

    const deviceScale =
        window.devicePixelRatio || 1;

    /*
     * Give the canvas a high-resolution internal
     * bitmap on Retina displays while retaining
     * normal CSS dimensions.
     */

    canvas.width =
        Math.round(
            rect.width * deviceScale
        );

    canvas.height =
        Math.round(
            rect.height * deviceScale
        );

    const context =
        canvas.getContext("2d");

    context.setTransform(
        deviceScale,
        0,
        0,
        deviceScale,
        0,
        0
    );

    /*
     * White background.
     */

    context.fillStyle = "white";

    context.fillRect(
        0,
        0,
        rect.width,
        rect.height
    );

    /*
     * Default drawing settings.
     */

    context.lineWidth = 8;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "black";

    return context;
}


/* =========================================================
   DRAWING INPUT
   ========================================================= */

function enableDrawing(canvas, context) {

    if (!canvas || !context) {

        console.error(
            "Cannot enable drawing."
        );

        return;
    }

    let drawing = false;


    function getPosition(event) {

        const rect =
            canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }


    /*
     * POINTER DOWN
     *
     * Works with:
     *
     * - Mac mouse
     * - Mac trackpad
     * - touchscreen
     * - stylus
     */

    canvas.addEventListener(
        "pointerdown",
        event => {

            if (!event.isPrimary) {
                return;
            }

            event.preventDefault();

            drawing = true;

            /*
             * Capture the pointer so drawing continues
             * even if the pointer moves slightly outside
             * the canvas.
             */

            if (canvas.setPointerCapture) {

                try {

                    canvas.setPointerCapture(
                        event.pointerId
                    );

                }
                catch (error) {

                    console.warn(
                        "Could not capture pointer:",
                        error
                    );
                }
            }

            const position =
                getPosition(event);

            /*
             * Draw an immediate dot.
             */

            context.fillStyle =
                context.strokeStyle;

            context.beginPath();

            context.arc(
                position.x,
                position.y,
                context.lineWidth / 2,
                0,
                Math.PI * 2
            );

            context.fill();

            /*
             * Begin the stroke at the same position.
             */

            context.beginPath();

            context.moveTo(
                position.x,
                position.y
            );
        }
    );


    /*
     * POINTER MOVE
     */

    canvas.addEventListener(
        "pointermove",
        event => {

            if (!drawing) {
                return;
            }

            if (!event.isPrimary) {
                return;
            }

            event.preventDefault();

            const position =
                getPosition(event);

            context.lineTo(
                position.x,
                position.y
            );

            context.stroke();

        }
    );


    /*
     * POINTER UP / CANCEL
     */

    function stopDrawing(event) {

        if (!drawing) {
            return;
        }

        drawing = false;

        context.closePath();

        if (canvas.releasePointerCapture) {

            try {

                canvas.releasePointerCapture(
                    event.pointerId
                );

            }
            catch (_) {
                // Pointer was already released.
            }
        }
    }


    canvas.addEventListener(
        "pointerup",
        stopDrawing
    );

    canvas.addEventListener(
        "pointercancel",
        stopDrawing
    );


    /*
     * Safety net if the browser loses the pointer.
     */

    canvas.addEventListener(
        "lostpointercapture",
        () => {

            drawing = false;

        }
    );
}


/* =========================================================
   NAME PAGE
   ========================================================= */

function initializeNamePage() {

    const nameInput =
        document.getElementById(
            "name-input"
        );

    const relationshipInput =
        document.getElementById(
            "relationship-input"
        );

    const frequencyInput =
        document.getElementById(
            "frequency-input"
        );

    const favoriteInput =
        document.getElementById(
            "favorite-input"
        );

    const improveInput =
        document.getElementById(
            "improve-input"
        );

    if (
        !nameInput ||
        !relationshipInput ||
        !frequencyInput ||
        !favoriteInput ||
        !improveInput
    ) {

        console.error(
            "Name page inputs not found."
        );

        return;
    }

    /*
     * Restore previous answers if the
     * participant navigates BACK.
     */

    nameInput.value =
        surveyData.name || "";

    relationshipInput.value =
        surveyData.relationship || "";

    frequencyInput.value =
        surveyData.frequency || "";

    favoriteInput.value =
        surveyData.favorite || "";

    improveInput.value =
        surveyData.improve || "";
    /*
     * Focus the first field.
     *
     * This also allows the operating system's
     * on-screen keyboard to appear on the Surface.
     */

    requestAnimationFrame(() => {

        nameInput.focus();

    });
}


/* =========================================================
   STORY PAGE
   ========================================================= */

function initializeStoryPage() {

    const canvas =
        document.getElementById(
            "story-canvas"
        );

    /*
     * Don't initialize the same canvas twice.
     */

    if (storyContext !== null) {
        return;
    }

    storyContext =
        setupCanvas(canvas);

    if (storyContext === null) {
        return;
    }

    storyContext.strokeStyle =
        "rgb(20, 20, 20)";

    storyContext.lineWidth = 8;

    enableDrawing(
        canvas,
        storyContext
    );
}


/* =========================================================
   DRAWING PAGE
   ========================================================= */

function initializeDrawingPage() {

    const canvas =
        document.getElementById(
            "drawing-canvas"
        );

    if (drawingContext === null) {

        drawingContext =
            setupCanvas(canvas);

        if (drawingContext === null) {
            return;
        }

        drawingContext.strokeStyle =
            "black";

        drawingContext.lineWidth = 8;

        enableDrawing(
            canvas,
            drawingContext
        );
    }

    updatePrompt();

    /*
     * Reset the selected color to black
     * whenever the drawing page starts.
     */

    document
        .querySelectorAll(".palette-color")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });

    const blackButton =
        document.querySelector(
            '.palette-color[data-color="black"]'
        );

    if (blackButton) {

        blackButton.classList.add(
            "selected"
        );
    }

    if (drawingContext) {

        drawingContext.strokeStyle =
            "black";

        drawingContext.lineWidth = 8;
    }
}


/* =========================================================
   START BUTTON
   ========================================================= */

document
    .getElementById("start-button")
    .addEventListener(
        "click",
        () => {

            /*
             * Clear all canvases before a new
             * participant begins.
             */

            resetCanvas(
                document.getElementById(
                    "name-canvas"
                ),
                nameContext
            );

            resetCanvas(
                document.getElementById(
                    "story-canvas"
                ),
                storyContext
            );

            resetCanvas(
                document.getElementById(
                    "drawing-canvas"
                ),
                drawingContext
            );

            surveyData = {
                name: null,
                nameText: "",
                story: null
            };

            showPage("name");
        }
    );


/* =========================================================
   NAME NAVIGATION
   ========================================================= */

document
    .getElementById("name-back")
    .addEventListener(
        "click",
        () => {

            showPage("start");

        }
    );


document
    .getElementById("name-next")
    .addEventListener(
        "click",
        () => {

            surveyData.name =
                document
                    .getElementById(
                        "name-input"
                    )
                    .value
                    .trim();

            surveyData.relationship =
                document
                    .getElementById(
                        "relationship-input"
                    )
                    .value
                    .trim();

            surveyData.frequency =
                document
                    .getElementById(
                        "frequency-input"
                    )
                    .value
                    .trim();

                    
            surveyData.favorite =
                document
                    .getElementById(
                        "favorite-input"
                    )
                    .value
                    .trim();

            surveyData.improve =
                document
                    .getElementById(
                        "improve-input"
                    )
                    .value
                    .trim();


            showPage("drawing");
            // showPage("story");

        }
    );


/* =========================================================
   STORY NAVIGATION
   ========================================================= */

document
    .getElementById("story-back")
    .addEventListener(
        "click",
        () => {

            showPage("name");

        }
    );


document
    .getElementById("story-next")
    .addEventListener(
        "click",
        () => {

            surveyData.story =
                "story.png";

            showPage("drawing");

        }
    );


/* =========================================================
   COLORS
   ========================================================= */

const paletteColors = {

    black:
        "rgb(0, 0, 0)",

    red:
        "rgb(255, 0, 0)",

    yellow:
        "rgb(255, 255, 0)",

    blue:
        "rgb(0, 0, 255)",

    green:
        "rgb(0, 180, 0)",

    orange:
        "rgb(255, 140, 0)",

    brown:
        "rgb(150, 75, 0)",

    silver:
        "rgb(180, 180, 180)",

    eraser:
            "rgb(255, 255, 255)"
};


document
    .querySelectorAll(".palette-color")
    .forEach(button => {

        /*
         * Prevent palette presses from being
         * interpreted as drawing input.
         */

        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();
                event.stopPropagation();

            }
        );

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                const color =
                    button.dataset.color;

                if (!drawingContext) {
                    return;
                }

                drawingContext.strokeStyle =
                    paletteColors[color];

                document
                    .querySelectorAll(".palette-color")
                    .forEach(other => {

                        other.classList.remove(
                            "selected"
                        );

                    });

                button.classList.add(
                    "selected"
                );

                console.log(
                    "Selected color:",
                    color
                );
            }
        );
    });


/* =========================================================
   CANVAS → PNG
   ========================================================= */

function canvasToBlob(canvas) {

    return new Promise(
        (resolve, reject) => {

            if (!canvas) {

                reject(
                    new Error(
                        "Canvas not found."
                    )
                );

                return;
            }

            canvas.toBlob(
                blob => {

                    if (!blob) {

                        reject(
                            new Error(
                                "Could not create PNG."
                            )
                        );

                        return;
                    }

                    resolve(blob);

                },
                "image/png"
            );
        }
    );
}


/* =========================================================
   SUBMIT
   ========================================================= */

function renderNameToCanvas() {

    const input =
        document.getElementById(
            "name-input"
        );

    const canvas =
        document.getElementById(
            "name-canvas"
        );

    if (!input || !canvas) {
        return;
    }

    const context =
        canvas.getContext("2d");

    /*
     * Clear the canvas.
     */

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * White background.
     */

    context.fillStyle = "white";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * Render the typed name.
     */

    const name =
        input.value.trim();

    context.fillStyle =
        "rgb(20, 20, 20)";

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    /*
     * Use a large font that fits
     * the name canvas.
     */

    const fontSize =
        Math.min(
            canvas.width * 0.10,
            canvas.height * 0.35
        );

    context.font =
        `bold ${fontSize}px Arial`;

    context.fillText(
        name,
        canvas.width / 2,
        canvas.height / 2
    );
}


async function submitDrawing() {

    const submitButton =
        document.getElementById(
            "submit-button"
        );

    /*
     * Prevent double submission.
     */

    if (submitButton.disabled) {
        return;
    }

    if (submitButton.dataset.armed === "true") {

        submitButton.dataset.armed = "false";

        window.clearTimeout(submitTimer);

    }
    else {

        submitButton.dataset.armed = "true";

        submitButton.classList.add("armed");

        submitTimer = window.setTimeout(() => {

            submitButton.dataset.armed = "false";

            submitButton.classList.remove("armed");

        }, 3000);

        return;
    }

    submitButton.disabled = true;

    submitButton.textContent =
        "SENDING...";

    try {

        const formData =
            new FormData();

        const survey = {
            ...surveyData,
            drawing_prompt: currentPrompt
        };

        formData.append(
            "survey",
            JSON.stringify(survey)
        );

        const drawingCanvas =
            document.getElementById(
                "drawing-canvas"
            );

        const storyCanvas =
            document.getElementById(
                "story-canvas"
            );

        /*
         * Convert all three drawings to PNG.
         */

        const drawingBlob =
            await canvasToBlob(
                drawingCanvas
            );

        const storyBlob =
            await canvasToBlob(
                storyCanvas
            );

        /*
         * Add files to multipart POST.
         */

        formData.append(
            "drawing",
            drawingBlob,
            "drawing.png"
        );

        formData.append(
            "story",
            storyBlob,
            "story.png"
        );

        console.log(
            "Sending submission..."
        );

        /*
         * Flask receives this POST at /submit.
         */

        const response =
            await fetch(
                monitor_url,
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        console.log(
            "Submission accepted by Flask."
        );

    }
    catch (error) {

        console.error(
            "Submission failed:",
            error
        );

        /*
         * We still move to THANKS.
         *
         * Flask handles the actual external
         * upload in its background thread.
         */

    }

    /*
     * Show THANKS immediately after the
     * local POST has been accepted.
     */

    showPage("thanks");

    /*
     * Give the participant 15 seconds,
     * then completely reset the experience.
     */

    window.setTimeout(
        resetExperience,
        15000
    );
}


/* =========================================================
   SUBMIT BUTTON
   ========================================================= */

document
    .getElementById("submit-button")
    .addEventListener(
        "pointerup",
        submitDrawing
    );

document
    .getElementById("drawing-back")
    .addEventListener(
        "click",
        () => {
            showPage("name");
        }
    );

document
    .getElementById("start-over-button")
    .addEventListener(
        "click",
        resetExperience
    );

/* =========================================================
   RESET CANVAS
   ========================================================= */

function resetCanvas(canvas, context) {

    if (!canvas || !context) {
        return;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT use getBoundingClientRect() here.
     *
     * The canvas is normally hidden when the
     * 15-second reset occurs, so its displayed
     * width/height would be zero.
     *
     * canvas.width and canvas.height refer
     * to the actual bitmap.
     */

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * Paint the entire canvas white.
     */

    context.fillStyle = "white";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * Restore drawing settings.
     */

    context.strokeStyle = "black";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.lineJoin = "round";
}


/* =========================================================
   COMPLETE SESSION RESET
   ========================================================= */

function resetExperience() {

    console.log(
        "Resetting experience."
    );

    /*
     * Clear NAME.
     */

    resetCanvas(
        document.getElementById(
            "name-canvas"
        ),
        nameContext
    );

    /*
     * Clear STORY.
     */

    resetCanvas(
        document.getElementById(
            "story-canvas"
        ),
        storyContext
    );

    const nameInput =
        document.getElementById(
            "name-input"
        );

    /*
     * Clear DRAWING.
     */

    resetCanvas(
        document.getElementById(
            "drawing-canvas"
        ),
        drawingContext
    );

    /*
     * Clear stored survey data.
     */

    surveyData = {
        name: "",
        relationship: "",
        frequency: "",
        favorite: "",
        improve: "",
        story: null
    };

    /*
     * Reset selected palette color.
     */

    document
        .querySelectorAll(".palette-color")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });

    const blackButton =
        document.querySelector(
            '.palette-color[data-color="black"]'
        );

    if (blackButton) {

        blackButton.classList.add(
            "selected"
        );
    }

    /*
     * Reset drawing color.
     */

    if (drawingContext) {

        drawingContext.strokeStyle =
            "black";

        drawingContext.lineWidth = 8;
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";
    }

    /*
     * Reset submit button.
     */

    const submitButton =
        document.getElementById(
            "submit-button"
        );

    submitButton.disabled = false;

    submitButton.dataset.armed = "false";

    submitButton.classList.remove("armed");

    submitButton.textContent =
        "TAP TWICE TO SUBMIT";

    /*
     * Get a new prompt for the next participant.
     */

    currentPrompt = "";

    updatePrompt();

    /*
     * Return to START.
     */

    showPage("start");
}


/* =========================================================
   FULLSCREEN RECOVERY
   ========================================================= */

let fullscreenRecoveryTimer = null;


/*
 * Try to enter fullscreen.
 */

async function enterFullscreen() {

    if (document.fullscreenElement) {
        return;
    }

    try {

        await document.documentElement.requestFullscreen();

        console.log(
            "Fullscreen restored."
        );

    }
    catch (error) {

        console.log(
            "Could not restore fullscreen:",
            error
        );
    }
}


/*
 * Start the 10-second recovery timer.
 *
 * This is only started when fullscreen is lost.
 */

function scheduleFullscreenRecovery() {

    /*
     * Don't create multiple timers.
     */

    if (fullscreenRecoveryTimer !== null) {
        return;
    }

    console.log(
        "Fullscreen lost. Recovery in 10 seconds."
    );

    fullscreenRecoveryTimer =
        window.setTimeout(
            () => {

                fullscreenRecoveryTimer =
                    null;

                /*
                 * The user may have returned to
                 * fullscreen during the 10 seconds.
                 */

                if (
                    !document.fullscreenElement
                ) {

                    console.log(
                        "Attempting fullscreen recovery."
                    );

                    enterFullscreen();
                }

            },
            10000
        );
}


/*
 * Cancel a pending recovery timer.
 */

function cancelFullscreenRecovery() {

    if (
        fullscreenRecoveryTimer !== null
    ) {

        window.clearTimeout(
            fullscreenRecoveryTimer
        );

        fullscreenRecoveryTimer =
            null;
    }
}


/*
 * Detect when Firefox leaves fullscreen.
 */

document.addEventListener(
    "fullscreenchange",
    () => {

        if (document.fullscreenElement) {

            /*
             * We are fullscreen again,
             * so there is nothing to recover.
             */

            cancelFullscreenRecovery();

            console.log(
                "Fullscreen active."
            );

        }
        else {

            /*
             * Firefox/Ubuntu has left fullscreen.
             *
             * Start the 10-second countdown.
             */

            scheduleFullscreenRecovery();
        }

    }
);


/*
 * If automatic recovery was rejected by Firefox,
 * the next touch/mouse press gives us a fresh
 * user interaction with which to request fullscreen.
 */

document.addEventListener(
    "pointerdown",
    () => {

        if (!document.fullscreenElement) {

            console.log(
                "User interaction detected. " +
                "Attempting fullscreen recovery."
            );

            /*
             * Cancel the 10-second timer because
             * we have a user gesture right now.
             */

            cancelFullscreenRecovery();

            enterFullscreen();
        }

    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

updatePrompt();

showPage("start");