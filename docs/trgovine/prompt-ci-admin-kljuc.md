# Prompt for Claude in Chrome — Admin API key for iOS signing in CI

Paste everything below the line into Claude in Chrome (logged in to App Store
Connect as Admin or Account Holder of Indigo Labs d.o.o.).

---

In App Store Connect (appstoreconnect.apple.com), team **Indigo Labs d.o.o.**,
I need to replace an API key. GitHub Actions can upload builds with the
current key, but signing ("cloud managed distribution certificate") requires
a key with **Admin** access.

Rules: stop and ask me before accepting terms, revoking anything or when a
login/2FA appears. Never open the downloaded key file or paste its contents
anywhere; only tell me the file name.

1. **Users and Access → Integrations → App Store Connect API → Team Keys.**
   Make sure the selected team (top right) is Indigo Labs d.o.o.
2. **Generate API Key**: name `SLFF CI Admin`, access **Admin** → Generate.
3. Report its **Key ID**. The Issuer ID is the same as before
   (`2ee5ea94-ca4e-42a4-aa09-b9504f917237`); confirm it.
4. **Download** the key (possible only once): `AuthKey_<KeyID>.p8` lands in
   Downloads. Confirm the file name.
5. The old App Manager key `SLFF CI` is no longer
   needed: ask me, and after I confirm, **Revoke** it.

Report:

```
New key: SLFF CI Admin / Admin
Key ID:
Issuer ID (unchanged?):
File name in Downloads:
Old key SLFF CI revoked: yes/no
```
