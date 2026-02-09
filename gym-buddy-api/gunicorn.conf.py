"""Gunicorn config - adds /app to sys.path before workers load."""

import sys

# Must run before workers import django_project
sys.path.insert(0, "/app")

bind = "0.0.0.0:8080"
workers = 1
