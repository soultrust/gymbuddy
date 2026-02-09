# Build from gymbuddy-api directory:
#   cd gymbuddy-api
#   gcloud builds submit --tag gcr.io/soultrust-gymbuddy/gymbuddy-api

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh /app/start_server.py

EXPOSE 8080

CMD ["sh", "-c", "cd /app && python manage.py migrate --noinput 2>&1 || true && exec gunicorn django_project.wsgi:application -c gunicorn.conf.py --bind 0.0.0.0:${PORT:-8080}"]
