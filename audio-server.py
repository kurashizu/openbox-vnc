#!/usr/bin/env python3
import asyncio
import os

import websockets

clients = set()


async def ws_handler(websocket):
    clients.add(websocket)
    print(f"[audio] client connected, total: {len(clients)}")
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)
        print(f"[audio] client disconnected, total: {len(clients)}")


async def stream_audio():
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-f",
        "pulse",
        "-i",
        "auto_null.monitor",
        "-c:a",
        "pcm_s16le",
        "-ar",
        "22050",  # 降低采样率减少带宽
        "-ac",
        "1",  # 单声道
        "-f",
        "s16le",
        "pipe:1",
        stdout=asyncio.subprocess.PIPE,
        stderr=open("/tmp/audio-ffmpeg.log", "w"),
        env={
            **os.environ,
            "PULSE_SERVER": "unix:/tmp/runtime-dev/pulse/native",
            "HOME": "/home/dev",
            "XDG_RUNTIME_DIR": "/tmp/runtime-dev",
        },
    )
    # 不需要攒数据，直接发
    buf = bytearray()
    while True:
        data = await proc.stdout.read(4096)
        if not data:
            break
        if clients:
            dead = set()
            for ws in list(clients):
                try:
                    await ws.send(data)
                except Exception:
                    dead.add(ws)
            clients.difference_update(dead)


async def main():
    asyncio.ensure_future(stream_audio())
    async with websockets.serve(ws_handler, "0.0.0.0", 6083):
        print("[audio] listening on :6083")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
