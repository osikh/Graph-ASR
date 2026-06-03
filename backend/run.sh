#!/usr/bin/env bash
# Install deps (first run only) then start the server
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
