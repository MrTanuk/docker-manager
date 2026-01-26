# Usamos Debian slim para tener acceso a herramientas de sistema reales
FROM debian:bookworm-slim

# Instalamos stress-ng (para carga) y procps (para ver PIDs internos)
RUN apt-get update && apt-get install -y \
    stress-ng \
    procps \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Creamos directorio de trabajo
WORKDIR /app

# Comando por defecto: Un script que mantiene vivo el contenedor e imprime su PID
CMD ["sh", "-c", "echo 'Contenedor Iniciado. PID interno: ' $$; while true; do sleep 30; done"]
