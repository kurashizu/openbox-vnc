import os
import ssl
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

# 宿主机接口配置
HOST_URL = "http://host.docker.internal:6081/api/clipboard"

# 全局变量与锁，用于去重和防止死循环
last_text = ""
text_lock = threading.Lock()

# 绕过自签名证书的 HTTPS 验证（因为你使用的是 https://host.docker.internal）
ssl_context = ssl._create_unverified_context()


def get_container_clipboard():
    """使用 xclip 读取容器本地剪切板"""
    try:
        res = subprocess.run(
            ["xclip", "-selection", "clipboard", "-o"],
            capture_output=True,
            text=True,
            timeout=1,
        )
        return res.stdout
    except Exception:
        return ""


def set_container_clipboard(text):
    """强制使用 UTF8_STRING 目标类型写入 xclip"""
    try:
        process = subprocess.Popen(
            ["xclip", "-selection", "clipboard", "-t", "UTF8_STRING", "-i"],
            stdin=subprocess.PIPE,
            text=True,
        )
        process.communicate(input=text)
    except Exception as e:
        print(f"写入剪切板失败: {e}", file=sys.stderr)


# ==================== 1. 发送端：监听容器内的 Ctrl+C ====================
def clipboard_listener():
    global last_text
    print("👉 容器剪切板监听线程已启动...")

    # 阻塞式监听 X11 剪切板变动
    process = subprocess.Popen(
        ["xclip", "-selection", "clipboard", "-listen"], stdout=subprocess.PIPE
    )

    while True:
        process.stdout.readline()  # 触发变动时释放阻塞
        current_text = get_container_clipboard()
        if not current_text:
            continue

        with text_lock:
            if current_text != last_text:
                last_text = current_text
                print(f"发现容器内新复制: {repr(current_text)}，正在发送至宿主机...")
                # 异步发送，防止网络卡顿挂起监听主循环
                threading.Thread(
                    target=send_to_host, args=(current_text,), daemon=True
                ).start()


def send_to_host(text):
    try:
        data = text.encode("utf-8")
        req = urllib.request.Request(
            HOST_URL, data=data, headers={"Content-Type": "text/plain"}, method="POST"
        )
        # 使用未验证的 SSL 上下文防止 https 报错
        with urllib.request.urlopen(req, context=ssl_context, timeout=3) as response:
            print(f"宿主机响应状态码: {response.status}")
    except urllib.error.URLError as e:
        print(f"发送至宿主机失败 (网络错误): {e.reason}", file=sys.stderr)
    except Exception as e:
        print(f"发送至宿主机失败: {e}", file=sys.stderr)


# ==================== 2. 接收端：原生 HTTP 服务器 ====================
class ClipboardHTTPHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        global last_text

        # 只处理 /api/clipboard 路径
        if self.path == "/api/clipboard":
            content_length = int(self.headers["Content-Length"])
            incoming_text = self.rfile.read(content_length).decode("utf-8")

            with text_lock:
                if incoming_text != last_text:
                    print(f"📥 收到来自宿主机的剪切板更新: {repr(incoming_text)}")
                    last_text = incoming_text
                    set_container_clipboard(incoming_text)

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"status":"success"}')
                else:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"status":"ignored"}')
        else:
            self.send_response(404)
            self.end_headers()

    # 屏蔽默认的控制台日志输出，保持终端干净
    def log_message(self, format, *args):
        return


def run_http_server():
    server_address = ("0.0.0.0", 6082)
    httpd = HTTPServer(server_address, ClipboardHTTPHandler)
    print("🌐 容器内原生 HTTP 服务已启动，监听 0.0.0.0:6082...")
    httpd.serve_forever()


if __name__ == "__main__":
    # 1. 启动剪切板原生监听线程
    listener_thread = threading.Thread(target=clipboard_listener, daemon=True)
    listener_thread.start()

    # 2. 主线程启动原生 Web 服务器
    try:
        run_http_server()
    except KeyboardInterrupt:
        print("\n服务已安全退出。")
