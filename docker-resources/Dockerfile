FROM debian:bookworm-slim

RUN apt-get update && apt-get install --no-install-recommends -y \
  python3 \
  stress-ng \
  procps \
  net-tools \
  iproute2 \
  curl \
  tree \
  nano \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/logs

COPY server.py /app/server.py

EXPOSE 8000

CMD ["python3", "-u", "/app/server.py"]
