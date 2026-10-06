#!/usr/bin/env python3
"""New mail in info@slff.eu -> Discord (sender, subject, start of the text).

Runs on the VM every 2 minutes (/etc/cron.d/slff-info-discord). Each posted message
gets the IMAP keyword SlffDiscord, so reading it in a mail client doesn't matter and
nothing is posted twice. Secrets come from /opt/slff/secrets.env
(INFO_IMAP_PASS, DISCORD_WEBHOOK).
"""
import email
import imaplib
import json
import urllib.request
from email.header import decode_header, make_header
from email.policy import default

ZNACKA = 'SlffDiscord'

env = {}
for vrstica in open('/opt/slff/secrets.env'):
    if '=' in vrstica and not vrstica.startswith('#'):
        k, v = vrstica.rstrip('\n').split('=', 1)
        env[k] = v.strip('"\'')


def besedilo(sporocilo):
    del_ = sporocilo.get_body(preferencelist=('plain', 'html'))
    if not del_:
        return ''
    t = del_.get_content()
    if del_.get_content_type() == 'text/html':
        import re
        t = re.sub(r'<[^>]+>', ' ', t)
    return ' '.join(t.split())[:700]


def v_discord(od, zadeva, odlomek):
    vsebina = f'📬 **info@slff.eu** — od {od}\n**{zadeva}**\n>>> {odlomek or "(brez besedila)"}'
    zahteva = urllib.request.Request(
        env['DISCORD_WEBHOOK'],
        data=json.dumps({'content': vsebina[:1990], 'allowed_mentions': {'parse': []}}).encode(),
        # Discord (Cloudflare) zavrne privzeti Python-urllib.
        headers={'Content-Type': 'application/json', 'User-Agent': 'SLFF info-v-discord (https://slff.eu)'},
    )
    urllib.request.urlopen(zahteva, timeout=15)


imap = imaplib.IMAP4_SSL('mail.slff.eu')
imap.login('info@slff.eu', env['INFO_IMAP_PASS'])
imap.select('INBOX')
_, ids = imap.uid('search', None, f'UNKEYWORD {ZNACKA}')
for uid in ids[0].split():
    _, podatki = imap.uid('fetch', uid, '(BODY.PEEK[])')
    sporocilo = email.message_from_bytes(podatki[0][1], policy=default)
    od = str(make_header(decode_header(sporocilo.get('From', '?'))))
    zadeva = str(make_header(decode_header(sporocilo.get('Subject', '(brez zadeve)'))))
    v_discord(od, zadeva, besedilo(sporocilo))
    imap.uid('store', uid, '+FLAGS', f'({ZNACKA})')
imap.logout()
