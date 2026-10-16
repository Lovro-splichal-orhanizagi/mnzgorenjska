# Delavec slff-scout: nočni stroj Scout (scout/stroj/). Sliko zgradi
# scripts/hetzner/objavi-scout.sh na strežniku iz app/ (brez testov).
FROM python:3.12.7-slim-bookworm
COPY app/ /app/
RUN pip install --no-cache-dir /app
USER nobody
CMD ["python", "-m", "stroj", "--zanka"]
