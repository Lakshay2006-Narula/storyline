FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix ./backend

COPY scraper/requirements.txt ./scraper/requirements.txt
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir -r /app/scraper/requirements.txt

COPY backend ./backend
COPY scraper ./scraper

ENV NODE_ENV=production \
    PYTHON_CMD=/app/.venv/bin/python \
    SCRAPER_PATH=/app/scraper/pipeline.py

WORKDIR /app/backend
EXPOSE 3001
CMD ["npm", "start"]
