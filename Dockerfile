FROM debian:bookworm-slim

# Instalamos python3, stress-ng y herramientas de red
RUN apt-get update && apt-get install -y \
    python3 \
    stress-ng \
    procps \
    net-tools \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Creamos el script del servidor web (Identity Server)
# Este script muestra los Namespaces visualmente en el navegador
RUN echo 'import http.server\n\
import socketserver\n\
import os\n\
import socket\n\
import subprocess\n\
\n\
PORT = 8000\n\
\n\
class Handler(http.server.SimpleHTTPRequestHandler):\n\
    def do_GET(self):\n\
        # Recolectar datos del Namespace\n\
        hostname = socket.gethostname()\n\
        try:\n\
            ip = subprocess.check_output(["hostname", "-I"]).decode().strip()\n\
        except: ip = "Unknown"\n\
        pid = os.getpid()\n\
        \n\
        # HTML con estilo "Hacker/Dashboard"\n\
        html = f"""\n\
        <html><head><title>Container Identity</title>\n\
        <style>\n\
            body {{ background: #09090b; color: #e4e4e7; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }}\n\
            .card {{ border: 1px solid #27272a; padding: 40px; border-radius: 12px; background: #18181b; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 600px; width: 100%; }}\n\
            h1 {{ color: #3b82f6; border-bottom: 1px solid #27272a; padding-bottom: 20px; }}\n\
            .item {{ margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }}\n\
            .label {{ color: #71717a; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }}\n\
            .value {{ font-size: 1.5rem; font-weight: bold; color: #fff; }}\n\
            .highlight {{ color: #a855f7; }}\n\
            .footer {{ margin-top: 30px; font-size: 0.8rem; color: #52525b; text-align: center; border-top: 1px solid #27272a; pt: 20px; }}\n\
        </style>\n\
        </head><body>\n\
        <div class="card">\n\
            <h1>Container Namespace View</h1>\n\
            <div class="item">\n\
                <span class="label">UTS Namespace (Hostname)</span>\n\
                <span class="value highlight">{hostname}</span>\n\
            </div>\n\
            <div class="item">\n\
                <span class="label">Network Namespace (IP)</span>\n\
                <span class="value" style="color: #10b981">{ip}</span>\n\
            </div>\n\
            <div class="item">\n\
                <span class="label">PID Namespace (Self ID)</span>\n\
                <span class="value" style="color: #f59e0b">{pid}</span>\n\
            </div>\n\
            <div class="footer">Este proceso cree ser único y tener su propia IP.</div>\n\
        </div>\n\
        </body></html>\n\
        """\n\
        self.send_response(200)\n\
        self.send_header("Content-type", "text/html")\n\
        self.end_headers()\n\
        self.wfile.write(html.encode())\n\
\n\
httpd = socketserver.TCPServer(("", PORT), Handler)\n\
print(f"Sirviendo en puerto {PORT}")\n\
httpd.serve_forever()\n\
' > server.py

# Ejecutamos el servidor python
CMD ["python3", "-u", "server.py"]
