# Survey

Run a survey that includes interactive drawing elements!


## Setup

- `git clone git@github.com:camoverride/survey_machine.git`
- `cd survey_machine`
- `pip install python3-dbus`
- `python3 -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements.txt`
- `curl https://gitlab.com/Oschowa/gnome-randr/-/raw/master/gnome-randr.py -o gnome-randr.py`
- `chmod u+x gnome-randr.py`


## Test

- `python app.py`


## Run in Production

Set up *systemd*:
- `mkdir -p ~/.config/systemd/user`
- `cat app.service > ~/.config/systemd/user/app.service`
- `systemctl --user daemon-reload`
- `systemctl --user enable app.service`
- `systemctl --user start app.service`
- `sudo loginctl enable-linger $(whoami)`

Show the logs:

- `journalctl --user -u app.service`

Clear logs:

- `sudo journalctl --unit=app.service --rotate`
- `sudo journalctl --vacuum-time=1s`

Then open the browser and go to **127.0.0.1:5000**

**NOTE**: screen rotation often fails and may have to be performed manually. Access the machine by ssh and do:

- `export XAUTHORITY=$(find /run/user/1000 -maxdepth 1 -name '.mutter-Xwaylandauth.*' -print -quit)`
- `./gnome-randr.py --output eDP-1 --rotate left`
