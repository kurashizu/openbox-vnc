FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# ── 阶段1: X11 & 显示 ────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    xserver-xorg-core \
    xserver-xorg-video-modesetting \
    xauth \
    x11-xserver-utils \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段2: GPU 加速 ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    mesa-vulkan-drivers \
    libvulkan1 \
    intel-media-va-driver \
    libgl1-mesa-dri \
    libgles2-mesa \
    libegl1-mesa \
    libpci3 \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段3: 桌面环境 ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    openbox \
    pcmanfm \
    tint2 \
    feh \
    xfce4-terminal \
    l3afpad \
    yad \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段4: 输入法 & 字体 ─────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    fcitx5 \
    fcitx5-chinese-addons \
    fcitx5-zhuyin \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段5: VNC & 音频 ────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    x11vnc \
    python3-websockify \
    python3-websockets \
    pulseaudio \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段6: 浏览器 ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    firefox-esr \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段7: 开发工具 ──────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    file \
    procps \
    xclip \
    tmux \
    xxd \
    net-tools \
    dnsutils \
    build-essential \
    nodejs \
    npm \
    flatpak \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# ── 阶段8: 用户 & 权限 ───────────────────────────────────────────────────
RUN useradd -m -s /bin/bash dev && \
    chown -R dev:dev /home/dev && \
    echo "dev ALL=(ALL) NOPASSWD: /usr/bin/apt-get" >> /etc/sudoers && \
    flatpak remote-add --if-not-exists flathub \
        https://dl.flathub.org/repo/flathub.flatpakrepo || true

# ── 阶段9: uv ────────────────────────────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -s /root/.local/bin/uv /usr/local/bin/uv && \
    ln -s /root/.local/bin/uvx /usr/local/bin/uvx

# ── 阶段10: Homebrew ─────────────────────────────────────────────────────
RUN su -s /bin/bash dev -c \
    'NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' \
    || true

# ── 文件 ─────────────────────────────────────────────────────────────────
COPY --chmod=755 entrypoint.sh /entrypoint.sh
COPY --chmod=644 xorg.conf /etc/X11/xorg.conf
COPY --chmod=755 audio-server.py /audio-server.py
COPY --chown=dev:dev clipboard.py /home/dev/clipboard.py
COPY --chown=dev:dev wallpaper.png /home/dev/wallpaper.png
COPY --chown=dev:dev welcome.txt /home/dev/welcome.txt

# ── 环境变量 ─────────────────────────────────────────────────────────────
ENV DISPLAY=:88
ENV GTK_IM_MODULE=fcitx
ENV QT_IM_MODULE=fcitx
ENV XMODIFIERS=@im=fcitx
ENV XDG_RUNTIME_DIR=/tmp/runtime-dev
ENV LIBVA_DRIVER_NAME=iHD
ENV MESA_LOADER_DRIVER_OVERRIDE=iris
ENV VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/intel_icd.x86_64.json
ENV PATH=/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:/home/dev/.linuxbrew/bin:/home/dev/.linuxbrew/sbin:/usr/local/bin:$PATH

EXPOSE 5908 6080 6082 6083

CMD ["/entrypoint.sh"]
