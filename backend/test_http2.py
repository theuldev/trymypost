import http.server
import socketserver
import threading
import time

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "ok"}')

if __name__ == "__main__":
    with socketserver.TCPServer(('127.0.0.1', 8000), Handler) as httpd:
        print('Server running on http://127.0.0.1:8000')
        # Keep main thread alive
        try:
            while True:
                httpd.handle_request()
        except KeyboardInterrupt:
            pass