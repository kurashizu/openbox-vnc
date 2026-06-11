#!/usr/bin/env python3
# /// script
# dependencies = [
#     "fastapi",
#     "websockets",
#     "uvicorn",
#     "httpx",
# ]
# ///
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path

import httpx
import uvicorn
import websockets
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# 自动获取当前脚本所在的绝对路径目录（即 /home/krsz/Projects/worker-test）
BASE_DIR = Path(__file__).resolve().parent

mailbox_log_path = BASE_DIR / "mailbox.log"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局剪切板数据
last_clipboard = ""
clipboard_lock = asyncio.Lock()


# Docker compose 控制
@app.post("/api/start")
async def start():
    subprocess.Popen(["docker", "compose", "up", "-d", "--build"], cwd=BASE_DIR)
    return {"status": "ok"}


@app.post("/api/stop")
async def stop():
    subprocess.Popen(["docker", "compose", "down"], cwd=BASE_DIR)
    return {"status": "ok"}


@app.post("/api/restart")
async def restart():
    subprocess.Popen(["docker", "compose", "restart"], cwd=BASE_DIR)
    return {"status": "ok"}


@app.get("/api/status")
async def status():
    result = subprocess.run(
        ["docker", "compose", "ps", "--format", "json"],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )
    try:
        import json

        data = json.loads(result.stdout)
        state = data.get("State", "")
        status_str = data.get("Status", "")
        if state == "running":
            return {"status": "online", "started_at": status_str.replace("Up ", "")}
        else:
            return {"status": "offline", "started_at": None}
    except:
        return {"status": "offline", "started_at": None}


# 剪切板数据
@app.post("/api/clipboard")
async def clipboard(request: Request):
    global last_clipboard
    body = await request.body()
    text = body.decode("utf-8")
    print(f"Clipboard received: {repr(text)}, length: {len(body)}")
    async with clipboard_lock:
        if text != last_clipboard:
            last_clipboard = text
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "http://localhost:6082/api/clipboard",
                        content=text.encode("utf-8"),
                        headers={"Content-Type": "text/plain"},
                        timeout=3.0,
                    )
            except Exception:
                pass
            return {"status": "success"}
        return {"status": "ignored"}


@app.get("/api/clipboard")
async def get_clipboard():
    global last_clipboard
    async with clipboard_lock:
        return {"clipboard": last_clipboard}


# VNC WebSocket 透传到容器 6080
@app.websocket("/vnc")
async def ws_proxy(websocket: WebSocket):  # 去掉 path 参数
    await websocket.accept()
    try:
        async with websockets.connect("ws://localhost:6080/") as upstream:  # 固定地址

            async def client_to_upstream():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await upstream.send(data)
                except Exception:
                    pass

            async def upstream_to_client():
                try:
                    async for msg in upstream:
                        if isinstance(msg, bytes):
                            await websocket.send_bytes(msg)
                        else:
                            await websocket.send_text(msg)
                except Exception:
                    pass

            await asyncio.gather(client_to_upstream(), upstream_to_client())
    except WebSocketDisconnect:
        pass


# 音频 WebSocket 透传到容器 6083
@app.websocket("/audio")
async def audio_proxy(websocket: WebSocket):
    await websocket.accept()
    try:
        async with websockets.connect(
            "ws://localhost:6083/audio",
            max_size=None,
            ping_interval=None,
            ping_timeout=None,
        ) as upstream:
            while True:
                try:
                    msg = await upstream.recv()
                    if isinstance(msg, bytes):
                        await websocket.send_bytes(msg)
                    else:
                        await websocket.send_text(msg)
                except Exception as e:
                    print(f"[audio] recv error: {e}")
                    break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[audio] proxy error: {e}")


# 捕获所有其他路径并重定向到网站
@app.api_route(
    "/{path_name:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
async def catch_all_external_redirect(request: Request, path_name: str):
    external_url = "https://openbox.022025.xyz/"
    return RedirectResponse(url=external_url, status_code=302)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6081)
