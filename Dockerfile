# Usamos Python ligero
FROM python:3.12-slim

# Creamos carpeta de trabajo
WORKDIR /app

# Creamos carpetas para logs y archivos
RUN mkdir -p /app/logs /app/files

# Exponemos el puerto (opcional, visual)
EXPOSE 8000

# Comando por defecto: Servidor web simple en la carpeta /app/files
CMD ["python", "-m", "http.server", "8000", "--directory", "/app/files"]
