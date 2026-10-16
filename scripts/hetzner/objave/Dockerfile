# Delavec slff-objave: slika Playwright (Chromium, Node) in ffmpeg za reele
# (H.264 + AAC). Playwrightov lastni ffmpeg zna le VP8/webm, zato sistemski.
# Različica = playwright iz package-lock.json (preveri scripts/hetzner/objavi-objave.sh).
FROM mcr.microsoft.com/playwright:v1.64.0-noble
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
