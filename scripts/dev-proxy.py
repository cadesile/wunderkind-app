#!/usr/bin/env python3
"""
HTTP reverse-proxy: 0.0.0.0:8080 → 127.0.0.1:52100 (Lando nginx)

Replaces the old TCP tunnel with an HTTP-aware proxy so that:
  • Expo web (browser) — CORS headers are injected on every response,
    so fetch() from http://localhost:19006 can reach http://localhost:8080.
  • Expo Go (Android/iOS) — forwards to the same host IP that Metro uses,
    unchanged from before.

Usage:  python3 scripts/dev-proxy.py [listen_port [target_port]]
"""
import http.server
import http.client
import socket
import sys
import urllib.parse

LISTEN_HOST = '0.0.0.0'
LISTEN_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
TARGET_HOST = '127.0.0.1'
TARGET_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 52100

# CORS headers added to every response (including error responses).
CORS_HEADERS = [
    ('Access-Control-Allow-Origin',  '*'),
    ('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'),
    ('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With'),
    ('Access-Control-Max-Age',       '86400'),
]

# Headers that must not be forwarded between proxy and client.
HOP_BY_HOP = frozenset([
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade',
])


def get_lan_ip() -> str:
    """Best-effort LAN IP detection (doesn't send any traffic)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '?.?.?.?'


class ProxyHandler(http.server.BaseHTTPRequestHandler):

    # ── Logging ───────────────────────────────────────────────────────────────

    def log_request(self, code='-', size='-'):
        # Only log non-2xx so the terminal stays readable.
        if isinstance(code, int) and not (200 <= code < 300):
            super().log_request(code, size)

    def log_message(self, fmt, *args):
        print(f'[proxy] {fmt % args}')

    # ── CORS helpers ─────────────────────────────────────────────────────────

    def _send_cors_headers(self):
        for name, value in CORS_HEADERS:
            self.send_header(name, value)

    # ── OPTIONS preflight ────────────────────────────────────────────────────

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.send_header('Content-Length', '0')
        self.end_headers()

    # ── All other methods ────────────────────────────────────────────────────

    def _read_body(self) -> bytes:
        length = int(self.headers.get('Content-Length', 0))
        return self.rfile.read(length) if length > 0 else b''

    def _forward(self, body: bytes = b''):
        conn = http.client.HTTPConnection(TARGET_HOST, TARGET_PORT, timeout=15)
        try:
            # Build forwarded headers (drop hop-by-hop and rewrite Host).
            fwd_headers = {}
            for name, value in self.headers.items():
                if name.lower() not in HOP_BY_HOP and name.lower() != 'host':
                    fwd_headers[name] = value
            fwd_headers['Host'] = f'{TARGET_HOST}:{TARGET_PORT}'
            # Tell the backend not to compress — simpler body forwarding.
            fwd_headers['Accept-Encoding'] = 'identity'

            conn.request(
                self.command,
                self.path,
                body=body if body else None,
                headers=fwd_headers,
            )
            resp = conn.getresponse()
            resp_body = resp.read()

            self.send_response(resp.status)
            self._send_cors_headers()
            for name, value in resp.getheaders():
                if name.lower() not in HOP_BY_HOP | {'content-encoding'}:
                    self.send_header(name, value)
            # Always set Content-Length to the actual body we're forwarding.
            self.send_header('Content-Length', str(len(resp_body)))
            self.end_headers()
            if resp_body:
                self.wfile.write(resp_body)

        except Exception as exc:
            print(f'[proxy] Backend error: {exc}')
            msg = b'{"error":"proxy_backend_unavailable"}'
            self.send_response(502)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
        finally:
            conn.close()

    def do_GET(self):    self._forward()
    def do_DELETE(self): self._forward()
    def do_HEAD(self):   self._forward()

    def do_POST(self):   self._forward(self._read_body())
    def do_PUT(self):    self._forward(self._read_body())
    def do_PATCH(self):  self._forward(self._read_body())


def main():
    lan_ip = get_lan_ip()
    server = http.server.ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), ProxyHandler)
    print(f'[proxy] Listening on {LISTEN_HOST}:{LISTEN_PORT} → {TARGET_HOST}:{TARGET_PORT}')
    print(f'[proxy] Web (Expo web)  → http://localhost:{LISTEN_PORT}')
    print(f'[proxy] Android Expo Go → http://{lan_ip}:{LISTEN_PORT}')
    print(f'[proxy] CORS: Access-Control-Allow-Origin: *')
    print('[proxy] Ctrl+C to stop')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[proxy] Stopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
