import http.server
import socketserver
import os
import socket
import subprocess

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 1. Obtener Hostname
        hostname = socket.gethostname()
        
        # 2. Obtener IP
        try:
            ip = subprocess.check_output(["hostname", "-I"]).decode().strip()
        except: 
            ip = "Unknown"

        # 3. Generar HTML de Variables de Entorno (Filtrando algunas internas de sistema si quieres)
        env_rows = ""
        # Ordenamos las keys para que sea más fácil leer
        for k in sorted(os.environ.keys()):
            v = os.environ[k]
            env_rows += f"""
            <div class="env-row">
                <span class="env-key">{k}</span>
                <span class="env-val">{v}</span>
            </div>
            """

        # 4. Construir el HTML completo
        html = f"""
        <html>
        <head>
            <title>Docker Manager Demo</title>
            <style>
                body {{ background: #09090b; color: #e4e4e7; font-family: 'Courier New', monospace; margin: 0; padding: 40px; }}
                .container {{ max-width: 900px; margin: 0 auto; }}
                .card {{ border: 1px solid #27272a; border-radius: 12px; background: #18181b; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
                
                .header {{ background: #27272a; padding: 20px; border-bottom: 1px solid #3f3f46; display: flex; justify-content: space-between; align-items: center; }}
                h1 {{ margin: 0; font-size: 1.2rem; color: #3b82f6; display: flex; align-items: center; gap: 10px; }}
                .status {{ font-size: 0.8rem; background: #059669; color: white; padding: 2px 8px; border-radius: 99px; }}

                .content {{ padding: 30px; }}
                
                .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .metric {{ background: #000000; padding: 15px; border-radius: 8px; border: 1px solid #27272a; }}
                .label {{ color: #71717a; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px; }}
                .value {{ font-size: 1.1rem; font-weight: bold; color: #fff; word-break: break-all; }}

                h2 {{ font-size: 1rem; color: #a1a1aa; border-bottom: 1px solid #27272a; padding-bottom: 10px; margin-top: 0; }}
                
                .env-list {{ display: grid; grid-template-columns: 1fr; gap: 1px; background: #27272a; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }}
                .env-row {{ display: grid; grid-template-columns: 250px 1fr; background: #18181b; }}
                .env-row:hover {{ background: #202022; }}
                .env-key {{ padding: 10px 15px; color: #a855f7; font-weight: bold; font-size: 0.85rem; border-right: 1px solid #27272a; }}
                .env-val {{ padding: 10px 15px; color: #d4d4d8; font-size: 0.85rem; word-break: break-all; }}

                /* Footer instruction */
                .footer {{ margin-top: 20px; text-align: center; color: #52525b; font-size: 0.8rem; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <div class="header">
                        <h1><span>🐳</span> Container Internal View</h1>
                        <span class="status">ONLINE</span>
                    </div>
                    <div class="content">
                        <!-- Info Básica -->
                        <div class="grid">
                            <div class="metric">
                                <span class="label">Hostname (UTS)</span>
                                <span class="value">{hostname}</span>
                            </div>
                            <div class="metric">
                                <span class="label">IP Address (Net)</span>
                                <span class="value" style="color: #10b981">{ip}</span>
                            </div>
                            <div class="metric">
                                <span class="label">Server Port</span>
                                <span class="value" style="color: #fbbf24">{PORT}</span>
                            </div>
                        </div>

                        <!-- Variables de Entorno -->
                        <h2>ENVIRONMENT VARIABLES</h2>
                        <div class="env-list">
                            {env_rows}
                        </div>
                    </div>
                </div>
                <div class="footer">
                    Generado por server.py dentro del contenedor
                </div>
            </div>
        </body>
        </html>
        """
        
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

# Iniciar servidor
print(f"Servidor iniciado en puerto {PORT}")
httpd = socketserver.TCPServer(("", PORT), Handler)
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    pass
