# Xvfb + VNC Commands

```bash
# Start Xvfb on display :88 with a screen resolution of 1280x720 and 24-bit color depth
Xvfb :88 -screen 0 1280x720x24

# Manage Firefox Profiles
DISPLAY=:88 firefox --no-remote --ProfileManager

# Start Firefox with a specific profile
DISPLAY=:88 firefox --no-remote -P VNC-SESSION --start-fullscreen

# Start x0vncserver to share the Xvfb display on port 5908 without any security types
x0vncserver -display :88 -rfbport 5908 -SecurityTypes None

```
