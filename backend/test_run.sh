#!/bin/bash
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 1115 > backend_log.txt 2>&1 &
SERVER_PID=$!
sleep 5

cat << 'PY_EOF' > test_enhance.py
import requests
import sys

base_url = "http://127.0.0.1:1115"
login_data = {"email": "admin@clipforge.app", "password": "admin123456"}
r1 = requests.post(f"{base_url}/api/auth/login", json=login_data)
if r1.status_code != 200:
    print(f"Login failed: {r1.text}")
    sys.exit(1)

token = r1.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
data = {"prompt": "Test script prompt", "provider": "gemini"}
r2 = requests.post(f"{base_url}/api/ai/enhance-script", headers=headers, json=data)
print(f"Status: {r2.status_code}")
PY_EOF

python test_enhance.py
sleep 5
kill $SERVER_PID
