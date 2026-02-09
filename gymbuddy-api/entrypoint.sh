#!/bin/sh
export PYTHONPATH=/app
cd /app

# Debug: Print environment
echo "Current directory: $(pwd)"
echo "PYTHONPATH: $PYTHONPATH"
echo "PORT: ${PORT:-8080}"
echo "Python path: $(which python)"
echo "Contents of /app:"
ls -la /app | head -20

# Check if django_project exists
if [ -d "/app/django_project" ]; then
    echo "✓ django_project directory exists"
else
    echo "✗ ERROR: django_project directory NOT FOUND"
    exit 1
fi

# Run migrations (non-blocking)
echo "Running migrations..."
python manage.py migrate --noinput 2>&1 || echo "Warning: Migrations failed, continuing..."

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn django_project.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 1