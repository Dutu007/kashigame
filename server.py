"""开发用静态服务器：禁用缓存，保证刷新总是拿到最新文件。用法: python server.py [端口]"""
import http.server
import subprocess
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def already_listening(port):
    """检测是否已有进程监听该端口。Windows 下 SO_REUSEADDR 允许第二个实例
    静默共存绑定同端口，两个"监听"互相干扰导致所有连接被拒（本机已踩过坑），
    所以启动前先用 netstat 明确检测，撞上就报错退出。"""
    try:
        out = subprocess.run(['netstat', '-ano'], capture_output=True,
                             timeout=5).stdout.decode('utf-8', 'ignore')
    except OSError:
        return False
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 4 and parts[3] == 'LISTENING' and parts[1].endswith(f':{port}'):
            return True
    return False


class ReuseServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True  # 允许快速重启（连接残留 TIME_WAIT 期间仍可重绑）
    request_queue_size = 32  # 浏览器会并发加载脚本、图片并预建连接


if already_listening(PORT):
    print(f'端口 {PORT} 已有服务在监听（可能已启动过服务器）。')
    print('如需重启，请先关闭旧的 python 服务器窗口或结束对应进程。')
    sys.exit(1)

with ReuseServer(('0.0.0.0', PORT), NoCacheHandler) as httpd:
    print(f'serving on http://localhost:{PORT} (no-cache)')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
