#!/usr/bin/env python
"""Start Gunicorn server with proper Python path setup."""
import sys
import os

# Debug output
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"sys.path before: {sys.path}")

# Ensure /app is in the Python path BEFORE any imports
sys.path.insert(0, "/app")
os.chdir("/app")

print(f"Current directory after chdir: {os.getcwd()}")
print(f"sys.path after: {sys.path}")
print(f"Checking if django_project exists: {os.path.exists('/app/django_project')}")
print(f"Contents of /app: {os.listdir('/app')[:10]}")

try:
    # Now import Django WSGI application (path is already set)
    print("Attempting to import django_project.wsgi...")
    from django_project.wsgi import application

    print("✓ Successfully imported django_project.wsgi")
except ImportError as e:
    print(f"✗ Failed to import django_project.wsgi: {e}")
    sys.exit(1)

# Import Gunicorn application class
try:
    from gunicorn.app.base import Application

    print("✓ Successfully imported gunicorn.app.base.Application")
except ImportError as e:
    print(f"✗ Failed to import gunicorn: {e}")
    sys.exit(1)


class StandaloneApplication(Application):
    """Gunicorn application wrapper."""

    def init(self, parser, opts, args):
        pass

    def load(self):
        return application


if __name__ == "__main__":
    port = os.environ.get("PORT", "8080")
    print(f"Starting Gunicorn on port {port}...")
    StandaloneApplication().run(bind=f"0.0.0.0:{port}", workers=1)
