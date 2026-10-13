# Slop PDF walkthrough recorder. Build with Podman or Docker:
#   podman build -t slop-recorder -f Containerfile .
# Run (CPU):   podman run --rm -v "$PWD/out:/out" slop-recorder
# Run (NVIDIA GPU, needs the NVIDIA container toolkit):
#   podman run --rm --device nvidia.com/gpu=all -v "$PWD/out:/out" slop-recorder
#   (Docker: docker run --rm --gpus all -v "$PWD/out:/out" slop-recorder)
FROM mcr.microsoft.com/playwright:v1.55.0-noble

# The virtual display and the screen recorder. The base image already has Chromium and Node.
RUN apt-get update \
 && apt-get install -y --no-install-recommends xvfb ffmpeg xauth \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY slop-pdf-demo.mjs sample.pdf run.sh ./
RUN chmod +x run.sh

ENV URL=https://slopographic.com/pdf/ \
    WIDTH=1920 HEIGHT=1080 FPS=60
VOLUME ["/out"]
ENTRYPOINT ["/app/run.sh"]
