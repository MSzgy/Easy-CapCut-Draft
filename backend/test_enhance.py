import requests

base_url = "http://127.0.0.1:1116"

login_data = {"email": "admin@clipforge.app", "password": "admin123456"}
r1 = requests.post(f"{base_url}/api/auth/login", json=login_data)
token = r1.json()["access_token"]

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
data = {"prompt": "Test script prompt", "provider": "gemini"}
r2 = requests.post(f"{base_url}/api/ai/enhance-script", headers=headers, json=data)
print(f"Status: {r2.status_code}")
