FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SERVICE_PORT=8005

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY packages/tip-common /packages/tip-common
RUN pip install --upgrade pip && pip install /packages/tip-common

COPY services/analytics/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY services/analytics/app ./app
COPY services/analytics/scripts ./scripts

RUN python scripts/train_budget_model.py && python scripts/train_attendance_model.py

EXPOSE 8005

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8005/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
