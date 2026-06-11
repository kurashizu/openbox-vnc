#!/bin/bash
echo "krsz-openbox" > /etc/hostname
hostname krsz-openbox
set -euo pipefail
mkdir -p /tmp/runtime-dev /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix
chmod 700 /tmp/runtime-dev
chown dev:dev /tmp/runtime-dev
export DISPLAY=:88
export XDG_RUNTIME_DIR=/tmp/runtime-dev
export LIBVA_DRIVER_NAME=iHD
export MESA_LOADER_DRIVER_OVERRIDE=iris
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/intel_icd.x86_64.json
export MOZ_ENABLE_WAYLAND=0
export MOZ_X11_EGL=1
export MOZ_ACCELERATED=1
export MOZ_WEBRENDER=1
rm -f /tmp/.X88-lock
Xorg :88 -config /etc/X11/xorg.conf -nolisten tcp -novtswitch &
XORG_PID=$!
for i in $(seq 1 100); do
    xdpyinfo -display :88 >/dev/null 2>&1 && break
    sleep 0.1
done
cat >/home/dev/dev-session.sh <<'EOF'
#!/bin/bash
set -euo pipefail
export DISPLAY=:88
export XDG_RUNTIME_DIR=/tmp/runtime-dev
export LIBVA_DRIVER_NAME=iHD
export MESA_LOADER_DRIVER_OVERRIDE=iris
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/intel_icd.x86_64.json
export MOZ_ENABLE_WAYLAND=0
export MOZ_X11_EGL=1
export MOZ_ACCELERATED=1
export MOZ_WEBRENDER=1
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
export PULSE_SERVER=unix:/tmp/runtime-dev/pulse/native

mkdir -p /home/dev/.config/fcitx5
cat > /home/dev/.config/fcitx5/profile << PROFILEEOF
[Groups/0]
Name=Default
Default Layout=us
DefaultIM=pinyin

[Groups/0/Items/0]
Name=keyboard-us
Layout=

[Groups/0/Items/1]
Name=pinyin
Layout=

[GroupOrder]
0=Default
PROFILEEOF

mkdir -p /home/dev/.config/openbox
cat > /home/dev/.config/openbox/rc.xml << RCEOF
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <desktops>
    <number>1</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>KRSZ</name>
    </names>
  </desktops>
</openbox_config>
RCEOF

mkdir -p /home/dev/.config/pcmanfm/default
cat > /home/dev/.config/pcmanfm/default/desktop-items-0.conf << PCMANFM
[*]
wallpaper_mode=stretch
wallpaper=/home/dev/wallpaper.png
show_documents=0
show_trash=0
show_mounts=0
desktop_font=Sans 10
desktop_fg=#ffffff
desktop_shadow=#000000
PCMANFM

mkdir -p /home/dev/.config/libfm
cat > /home/dev/.config/libfm/libfm.conf << LIBFM
[config]
quick_exec=1
LIBFM

mkdir -p /home/dev/.mozilla/firefox/default
cat > /home/dev/.mozilla/firefox/default/user.js << USERJS
user_pref("media.ffmpeg.vaapi.enabled", true);
user_pref("media.hardware-media-key-handling.enabled", true);
user_pref("gfx.webrender.all", true);
user_pref("media.av1.enabled", true);
USERJS



mkdir -p /home/dev/Desktop
cat > /home/dev/Desktop/firefox.desktop << DESKTOP
[Desktop Entry]
Name=Firefox
Exec=firefox-esr --no-sandbox
Icon=firefox-esr
Type=Application
Terminal=false
DESKTOP
chmod +x /home/dev/Desktop/firefox.desktop

cat > /home/dev/Desktop/files.desktop << DESKTOP
[Desktop Entry]
Name=Files
Exec=pcmanfm /home/dev
Icon=folder
Type=Application
Terminal=false
DESKTOP
chmod +x /home/dev/Desktop/files.desktop

cat > /home/dev/Desktop/terminal.desktop << DESKTOP
[Desktop Entry]
Name=Terminal
Exec=xfce4-terminal
Icon=utilities-terminal
Type=Application
Terminal=false
DESKTOP
chmod +x /home/dev/Desktop/terminal.desktop

pkill -x fcitx5 || true
pkill -f fcitx || true
sleep 2
rm -f /tmp/fcitx5* /tmp/runtime-dev/fcitx* 2>/dev/null || true
sleep 1
fcitx5 -d &
sleep 3

(while true; do
    openbox
    sleep 1
done) &

sleep 2
pcmanfm --desktop &
tint2 &

python3 /home/dev/clipboard.py &

yad --text-info \
    --title="Welcome" \
    --width=600 --height=400 \
    --center \
    --button="gtk-ok:0" \
    --wrap \
    --filename=/home/dev/welcome.txt \

wait
EOF
chown dev:dev /home/dev/dev-session.sh
chmod +x /home/dev/dev-session.sh
su -s /bin/bash dev -c 'dbus-run-session -- /home/dev/dev-session.sh' &
DEV_SESSION_PID=$!
x11vnc \
  -display :88 \
  -rfbport 5908 \
  -forever \
  -shared \
  -nopw \
  -bg \
  -o /tmp/x11vnc.log \
  -repeat \
  -xkb

# 启动 PulseAudio
su -s /bin/bash dev -c "pulseaudio --start --exit-idle-time=-1 --daemon" || true
sleep 2

# 音频推流服务
su -s /bin/bash dev -c "PULSE_SERVER=unix:/tmp/runtime-dev/pulse/native python3 /audio-server.py" &

exec websockify 6080 localhost:5908
