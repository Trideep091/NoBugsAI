"""Vercel Serverless Function Entry Point for NoBugs AI FastAPI Backend"""
import sys
import os

# Ensure backend and root paths are in sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_path = os.path.join(repo_root, "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# In serverless environments (Vercel / AWS Lambda), the root filesystem is read-only.
# Redirect SQLite database to the writable /tmp directory.
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/nobugs.db")

from app.main import app

# Vercel ASGI handler
app = app
