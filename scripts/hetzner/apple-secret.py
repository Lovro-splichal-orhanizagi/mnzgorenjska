#!/usr/bin/env python3
"""Sign in with Apple: generate APPLE_SECRET (an ES256 JWT, valid at most 6 months)
from the .p8 key and write it to /opt/slff/secrets.env and /opt/supabase/.env.

Run on the VM:  python3 /opt/slff/apple-secret.py && cd /opt/supabase && docker compose up -d auth
Apple login stops working when the secret expires; re-run before the date it prints.
"""
import re
import time
from datetime import datetime, timezone

import jwt  # PyJWT (apt: python3-jwt)

KEY = '/opt/slff/keys/AuthKey_A66B3FC5HV.p8'
KEY_ID = 'A66B3FC5HV'
TEAM_ID = 'H8ZMYS5NUY'          # Indigo Labs d.o.o.
CLIENT_ID = 'eu.slff.app.signin'  # Services ID used by the web OAuth flow
ENV_FILES = ['/opt/slff/secrets.env', '/opt/supabase/.env']

now = int(time.time())
exp = now + 180 * 24 * 3600  # Apple's maximum is 15777000 s (~182.6 days)
token = jwt.encode(
    {'iss': TEAM_ID, 'iat': now, 'exp': exp, 'aud': 'https://appleid.apple.com', 'sub': CLIENT_ID},
    open(KEY).read(),
    algorithm='ES256',
    headers={'kid': KEY_ID},
)

for path in ENV_FILES:
    text = open(path).read()
    line = f'APPLE_SECRET={token}'
    text = re.sub(r'^APPLE_SECRET=.*$', line, text, flags=re.M) if re.search(r'^APPLE_SECRET=', text, re.M) else text.rstrip('\n') + f'\n{line}\n'
    open(path, 'w').write(text)

print('APPLE_SECRET written; expires', datetime.fromtimestamp(exp, timezone.utc).date())
