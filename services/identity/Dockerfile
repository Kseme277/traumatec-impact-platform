FROM python:3.11-slim

ARG SERVICE_PORT=8001
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SERVICE_PORT=${SERVICE_PORT}

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY packages/tip-common /packages/tip-common
RUN pip install --upgrade pip && pip install /packages/tip-common

COPY services/identity/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY services/identity/app ./app

EXPOSE ${SERVICE_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"SERVICE_PORT\"]}/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
