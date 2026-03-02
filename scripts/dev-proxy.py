#!/usr/bin/env python3
"""
TCP proxy: binds 0.0.0.0:8080 → forwards to 127.0.0.1:52159 (Lando nginx)
Lets Android device on LAN reach the Lando backend via http://192.168.1.156:8080
Usage: python3 scripts/dev-proxy.py
"""
import socket
import threading
import sys

LISTEN_HOST = '0.0.0.0'
LISTEN_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
TARGET_HOST = '127.0.0.1'
TARGET_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 52159


def pipe(src: socket.socket, dst: socket.socket):
    try:
        while chunk := src.recv(4096):
            dst.sendall(chunk)
    except Exception:
        pass
    finally:
        try:
            src.shutdown(socket.SHUT_RD)
        except Exception:
            pass
        try:
            dst.shutdown(socket.SHUT_WR)
        except Exception:
            pass


def handle(client: socket.socket, addr):
    try:
        server = socket.create_connection((TARGET_HOST, TARGET_PORT), timeout=10)
    except Exception as e:
        print(f'[proxy] Cannot connect to {TARGET_HOST}:{TARGET_PORT}: {e}')
        client.close()
        return
    t1 = threading.Thread(target=pipe, args=(client, server), daemon=True)
    t2 = threading.Thread(target=pipe, args=(server, client), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    client.close()
    server.close()


def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((LISTEN_HOST, LISTEN_PORT))
    sock.listen(64)
    print(f'[proxy] Listening on {LISTEN_HOST}:{LISTEN_PORT} → {TARGET_HOST}:{TARGET_PORT}')
    print(f'[proxy] Android can reach backend at http://192.168.1.156:{LISTEN_PORT}')
    print('[proxy] Ctrl+C to stop')
    try:
        while True:
            client, addr = sock.accept()
            threading.Thread(target=handle, args=(client, addr), daemon=True).start()
    except KeyboardInterrupt:
        print('\n[proxy] Stopped.')
    finally:
        sock.close()


if __name__ == '__main__':
    main()
