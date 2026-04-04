#!/usr/bin/env python3
from google_auth_oauthlib.flow import InstalledAppFlow
from pathlib import Path
import json
import os

os.makedirs(Path.home() / '.credentials', exist_ok=True)

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

flow = InstalledAppFlow.from_client_secrets_file(
    '/Users/ki/Documents/cloudpipe-macao-app/credentials.json',
    SCOPES
)

creds = flow.run_local_server(port=8888)

token_path = Path.home() / '.credentials/token.json'
token_path.parent.mkdir(parents=True, exist_ok=True)

with open(token_path, 'w') as f:
    json.dump({
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }, f)

print('✅ 認證已保存到 ~/.credentials/token.json')
