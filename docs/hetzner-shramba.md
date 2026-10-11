# Storage on the Hetzner VM (player photos)

Player photos (PR #198, "To sem jaz") live in the Storage bucket `fotografije-igralcev`.
The migration to Hetzner left Storage out (`docs/migracija-hetzner.md`), so uploads fail
until this runbook is done. Nothing in the frontend changes.

## Decision: official `storage-api` with the file backend, no MinIO

| option | moving parts | verdict |
|---|---|---|
| **a) `supabase/storage-api` + `STORAGE_BACKEND=file` on a bind mount** | 1 container | **chosen** |
| b) `storage-api` + S3 backend on MinIO (or RustFS, `docker-compose.s3.yml`) | 2 containers, bucket, keys | no gain at this size |
| c) own upload endpoint (edge function + Caddy `file_server`) | new code, own auth/RLS | frontend would change |

- The base `docker-compose.yml` on the VM already defines `storage` with the file backend
  (`./volumes/storage:/var/lib/storage`), and Envoy already routes `/storage/v1/` to it
  (`volumes/api/envoy/lds.template.yaml`, cluster `storage:5000`, no key check: Storage
  does auth and RLS itself). Caddy already forwards `/storage/v1/*` on both `api.slff.eu`
  and `slff.eu`. So the work is: stop disabling the service, drop its imgproxy dependency.
- supabase-js (`supabase.storage.from(…).upload/remove`, public URLs
  `/storage/v1/object/public/…`) works unchanged: same API as Supabase Cloud.
- MinIO would add a second stateful service, credentials and a bucket for roughly
  30 KB per player. S3 only pays off with several servers or object storage elsewhere.
- No imgproxy: the browser already produces the 256 px and 64 px WebP
  (`pripraviFotografijo`), nothing asks for transforms.
- `storage-api` runs its own migrations on start (table `storage.migrations`, 70 of them in
  v1.74.0), as role `supabase_storage_admin`, only inside schema `storage`. Our
  `supabase/migrations` do not create anything there; `prevzem_igralca` only calls
  `prevzem_pripravi_shrambo()` when `storage.buckets` exists. No conflict: CI's
  `supabase_migrations.schema_migrations` and `storage.migrations` are separate.

What changed in the repo:

- `scripts/hetzner/docker-compose.slff.yml`: `storage` enabled, pinned to
  `supabase/storage-api:v1.74.0` (the version of the base file on the VM, `versions.md`
  2026-09-09), `depends_on` only `db` + `rest`, image transformation off, 5 MB global
  limit (the bucket allows 2 MB), `mem_limit: 384m`. Keys, JWT secret, JWKS and
  `DATABASE_URL` come from the base file and `/opt/supabase/.env`, as for the other services.
- `scripts/hetzner/Caddyfile`: `/storage/v1/object/public/*` keeps Storage's
  `Cache-Control` (the upload sets a year; file names are random) instead of
  `private, no-store`; everything else under the API stays `private, no-store`.
- `scripts/hetzner/varnostna.sh`: the files go to the Storage Box each hour.

Tested locally (2026-10-11) on `supabase/postgres:17.6.1.166` with the same empty
`storage` schema and grants as production: storage-api v1.74.0 migrates cleanly,
`prevzem_pripravi_shrambo()` creates the bucket and the four policies, and through
`@supabase/storage-js` (what `supabase.storage` uses): owner uploads 256 + 64 px, public
download works without a key (`image/webp`, `max-age=31536000`), a different user, anon,
a path outside the pattern, a non-image type and a file over 2 MB are refused, a
different user cannot delete, the owner can, and the public URL stops working.
ES256 user tokens (JWKS) and HS256 both verify. `prevzem_odstrani_fotografije()` removes
the row (the URL stops working).

## Disk and backup

- Files: `/opt/supabase/volumes/storage/stub/stub/fotografije-igralcev/<player>/<name>.webp/<version>`
  (`stub` = `GLOBAL_S3_BUCKET` and `STORAGE_TENANT_ID` in `.env`). Rows: `storage.objects`,
  already in the hourly `pg_dump`.
- Size: 256 px WebP ~15–25 KB + 64 px ~2–3 KB, call it 30 KB per player.
  1,000 photos ≈ 30 MB, 10,000 ≈ 300 MB. The VM has 49 GB free (2026-10-11).
- Backup: `varnostna.sh` rsyncs the directory every hour to the Storage Box
  `shramba/zdaj/`. A file deleted on the server moves to `shramba/izbrisane/<day>/` and is
  pruned after 30 days with the daily dumps, so any kept dump finds its photos and a
  removed photo does not stay in the backup for ever.
- Restore: `pg_restore` as usual (brings `storage.*`), then
  `rsync -a -e 'ssh -p 23 -i /root/.ssh/backup_ed25519' u685650@u685650.your-storagebox.de:shramba/zdaj/ /opt/supabase/volumes/storage/`.

## Runbook

All commands run **on your laptop**, in the repo, on `main` after this PR is merged
(`git pull`). Everything on the server goes through `ssh SLFF`. Nothing here restarts
the database, PostgREST or auth.

### 1. Save the current config

```bash
ssh SLFF 'D=/opt/slff/backup-konfig; S=$(date +%Y%m%d-%H%M); cp /opt/supabase/docker-compose.slff.yml $D/docker-compose.slff.yml.$S && cp /etc/caddy/Caddyfile $D/Caddyfile.$S && cp /opt/slff/varnostna.sh $D/varnostna.sh.$S && ls -t $D | head -3'
```

Note the suffix (`.$S`) it printed; rollback uses it.

### 2. Copy the files and look at the diff

```bash
scp scripts/hetzner/docker-compose.slff.yml SLFF:/tmp/docker-compose.slff.yml
scp scripts/hetzner/Caddyfile SLFF:/tmp/Caddyfile
scp scripts/hetzner/varnostna.sh SLFF:/tmp/varnostna.sh
ssh SLFF 'diff /opt/supabase/docker-compose.slff.yml /tmp/docker-compose.slff.yml; diff /etc/caddy/Caddyfile /tmp/Caddyfile; diff /opt/slff/varnostna.sh /tmp/varnostna.sh'
```

Besides storage, the diff also shows changes that are on `main` but were never copied to
the VM (2026-10-11): auth mail subjects for `pl`, `es`, `lv` in the compose file, and in
the Caddyfile `/pl`, `/es`, `/lv`, `/claim` and `/u/*` (until then `/claim`, the page of
PR #198, answers with status 404). They are meant to be live; if anything else shows up,
stop and ask.

### 3. Start Storage

```bash
ssh SLFF 'cp /tmp/docker-compose.slff.yml /opt/supabase/docker-compose.slff.yml && cd /opt/supabase && docker compose config --services && docker compose pull storage && docker compose up -d --no-deps storage'
```

`config --services` must list `storage` and not `imgproxy`. `--no-deps` starts only
Storage; auth keeps running with its old mail subjects until it is recreated (step 8).

Wait ~20 s, then:

```bash
ssh SLFF 'docker ps --filter name=supabase-storage --format "{{.Names}} {{.Status}}"; docker logs --tail 5 supabase-storage'
ssh SLFF 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*), max(name) from storage.migrations"'
```

Expected: `Up … (healthy)`, `[Server] Started Successfully`, and `70|vector-buckets`.

### 4. Bucket and policies

```bash
ssh SLFF 'docker exec -i supabase-db psql -U supabase_admin -d postgres' <<'SQL'
select public.prevzem_pripravi_shrambo();
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
select policyname from pg_policies where schemaname = 'storage' order by 1;
SQL
```

Expected: bucket `fotografije-igralcev | t | 2097152 | {image/jpeg,image/png,image/webp}`
and four policies `fotografije igralcev: lastnik bere/izbriše/naloži/zamenja` (the
`does not exist, skipping` notices are normal the first time).

### 5. Gateway

```bash
ssh SLFF 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/storage/v1/status'
```

Expected `200`. If it is `503` after a minute (Envoy has not picked the container up):
`ssh SLFF 'docker restart supabase-envoy'` (a few seconds of API downtime) and check again.

### 6. Caddy and backup script

```bash
ssh SLFF 'caddy validate --config /tmp/Caddyfile --adapter caddyfile && cp /tmp/Caddyfile /etc/caddy/Caddyfile && systemctl reload caddy && cp /tmp/varnostna.sh /opt/slff/varnostna.sh && chmod +x /opt/slff/varnostna.sh'
ssh SLFF '/opt/slff/varnostna.sh && ssh -p 23 -i /root/.ssh/backup_ed25519 u685650@u685650.your-storagebox.de "ls shramba"'
```

The manual backup run prints `… ok slff-….dump …`, the box lists `izbrisane zdaj`.

### 7. Verify end to end

Upload, download over both hosts, refuse anon, delete. Runs on the server so the keys
never leave it; the test file is a crest from the site.

```bash
ssh SLFF bash -s <<'SH'
cd /opt/supabase
k() { grep "^$1=" .env | cut -d= -f2-; }
SK=$(k SUPABASE_SECRET_KEY); SJ=$(k SERVICE_ROLE_KEY_ASYMMETRIC)
PK=$(k SUPABASE_PUBLISHABLE_KEY); AJ=$(k ANON_KEY_ASYMMETRIC)
B=fotografije-igralcev; P=0/preizkus-$(date +%s).webp
curl -fsS -o /tmp/preizkus.webp https://slff.eu/grbi/adria.webp
echo "1) service upload (ES256 token), expect 200:"
curl -sS -w ' %{http_code}\n' -X POST "https://api.slff.eu/storage/v1/object/$B/$P" \
  -H "apikey: $SK" -H "Authorization: Bearer $SJ" -H 'Content-Type: image/webp' \
  -H 'cache-control: max-age=60' --data-binary @/tmp/preizkus.webp
echo "2) anon upload, expect 400/403 (row-level security):"
curl -sS -w ' %{http_code}\n' -X POST "https://api.slff.eu/storage/v1/object/$B/0/anon.webp" \
  -H "apikey: $PK" -H "Authorization: Bearer $AJ" -H 'Content-Type: image/webp' \
  --data-binary @/tmp/preizkus.webp
echo "3) public download, expect 200, image/webp, max-age=60 on both:"
for h in api.slff.eu slff.eu; do
  curl -sS -o /dev/null -D - "https://$h/storage/v1/object/public/$B/$P" | grep -iE '^(HTTP|content-type|cache-control)'
done
echo "4) delete, expect 200 and then 400 for the URL:"
curl -sS -w ' %{http_code}\n' -X DELETE "https://api.slff.eu/storage/v1/object/$B" \
  -H "apikey: $SK" -H "Authorization: Bearer $SJ" -H 'Content-Type: application/json' \
  -d "{\"prefixes\":[\"$P\"]}"
curl -sS -o /dev/null -w ' %{http_code}\n' "https://api.slff.eu/storage/v1/object/public/$B/$P?po=$RANDOM"
rm -f /tmp/preizkus.webp
SH
```

RLS directly in the database (rolled back, writes nothing): a signed-in user who does
not own player 1 must be refused.

```bash
ssh SLFF 'docker exec -i supabase-db psql -U supabase_admin -d postgres' <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
insert into storage.objects (bucket_id, name) values ('fotografije-igralcev', '1/preizkus.webp');
rollback;
SQL
```

Expected: `ERROR: new row violates row-level security policy for table "objects"`.

Finally in the app: a confirmed player (or an admin-confirmed test claim) uploads a photo
on their player page, sees it, replaces it, removes it.

### 8. Optional: pending auth mail subjects

The compose file copied in step 3 also carries the `pl`, `es`, `lv` mail subjects. They
apply when auth is recreated (a few seconds without sign-in):

```bash
ssh SLFF 'cd /opt/supabase && docker compose up -d --no-deps auth'
```

## Rollback

Storage off (uploads fail again as before; photos and rows stay):

```bash
ssh SLFF 'S=<suffix from step 1>; D=/opt/slff/backup-konfig; cd /opt/supabase && docker compose stop storage && docker compose rm -f storage && cp $D/docker-compose.slff.yml.$S docker-compose.slff.yml'
```

Caddy and the backup script back (both are harmless with Storage off, so only if they are
the problem):

```bash
ssh SLFF 'S=<suffix>; D=/opt/slff/backup-konfig; cp $D/Caddyfile.$S /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && systemctl reload caddy && cp $D/varnostna.sh.$S /opt/slff/varnostna.sh'
```

The `storage` schema stays (the next start reuses it). Do not drop it while
`fotografije_igralcev` points at photos.

## Operations

- **Removing a photo right away** (inappropriate, GDPR): `prevzem_odstrani_fotografije(id)`
  (or the admin page) removes the row; the URL then answers 400 from the server. Browsers
  and Cloudflare may still hold the old copy for up to a year (`max-age=31536000`), so
  also purge both URLs in Cloudflare (Caching → Configuration → Purge Cache → Custom
  Purge): `https://api.slff.eu/storage/v1/object/public/fotografije-igralcev/<path>` and
  the same on `https://slff.eu/…`, plus the `-64.webp` variant.
- **Orphan files.** Deleting through SQL (`prevzem_odstrani_fotografije`, anonymisation)
  removes only the row; the file stays on disk, not public. List them, check, then delete:

  ```bash
  ssh SLFF bash -s <<'SH'
  cd /opt/supabase/volumes/storage/stub/stub/fotografije-igralcev || exit 0
  docker exec supabase-db psql -U supabase_admin -d postgres -Atc \
    "select name || '/' || version from storage.objects where bucket_id = 'fotografije-igralcev'" | sort > /tmp/v-bazi
  find . -type f | sed 's|^\./||' | sort > /tmp/na-disku
  comm -13 /tmp/v-bazi /tmp/na-disku    # files without a row; to delete: | xargs -r rm -v
  SH
  ```

- **Upgrading** `storage-api`: change the tag in `docker-compose.slff.yml` (keep it with
  the rest of the stack, `versions.md`), then `docker compose pull storage && docker
  compose up -d --no-deps storage`; it migrates `storage.*` itself on start.
