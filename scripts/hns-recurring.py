#!/usr/bin/env python3
"""Serial recurring HNS capture; immutable daily runs, shared request budget, no DB writes."""
import argparse
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

# The incident implementation remains frozen; reuse its durable transport guardrails.
_spec = importlib.util.spec_from_file_location('hns_incident_collector', Path(__file__).with_name('hns-collector.py'))
_incident = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_incident)
Ledger, BudgetExhausted, SourceBlocked = _incident.Ledger, _incident.BudgetExhausted, _incident.SourceBlocked
refused, validate_html, atomic = _incident.refused, _incident.validate_html, _incident.atomic


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def timestamp(value):
    require(isinstance(value, str) and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)', value), 'UTC timestamp required')
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def stamp(now):
    return datetime.fromtimestamp(now, timezone.utc).isoformat()


def validate_manifest(manifest, now):
    require(isinstance(manifest, dict), 'invalid manifest')
    for key, value in dict(schema=2, source='hns', mode='recurring', season='2026/27').items():
        require(manifest.get(key) == value, 'invalid manifest ' + key)
    created, expires = timestamp(manifest.get('createdAt')), timestamp(manifest.get('expiresAt'))
    require(created <= now < expires and 0 < expires-created <= 86400, 'manifest expired, future-dated or exceeds 24 hours')
    today = datetime.fromtimestamp(created, timezone.utc).date()
    require(manifest.get('toDate') == today.isoformat() and manifest.get('fromDate') == (today-timedelta(days=13)).isoformat(), 'manifest must cover fourteen UTC calendar days')
    require('2026-07-01' <= manifest['fromDate'] <= manifest['toDate'] <= '2027-06-30', 'review next season before collection')
    leagues = manifest.get('leagues')
    require(isinstance(leagues, list) and len(leagues) == 139, 'review changed league inventory')
    ids, slugs, codes = set(), set(), set()
    for league in leagues:
        require(isinstance(league, dict), 'invalid league tuple')
        lid, slug, code = league.get('id'), league.get('slug'), league.get('code')
        require(type(lid) is int and 0 < lid <= 9007199254740991, 'invalid league id')
        require(isinstance(slug, str) and re.fullmatch(r'hr-[a-z0-9-]+', slug) and slug != 'hr-prva-hnlz', 'invalid league slug')
        require(isinstance(code, str) and re.fullmatch(r'\d+', code), 'invalid league code')
        require(lid not in ids and slug not in slugs and code not in codes, 'duplicate league tuple')
        ids.add(lid); slugs.add(slug); codes.add(code)
        completed = league.get('completed')
        require(isinstance(completed, list) and all(isinstance(x, str) and re.fullmatch(r'\d+', x) for x in completed), 'invalid completed report id')
        require(len(completed) == len(set(completed)), 'duplicate completed report id')
    return manifest


def parse(kind, path, fixture=None, code=None, parent_name=None):
    result = subprocess.run(['node', str(Path(__file__).with_name('hns-recurring-parse.mjs'))],
                            input=json.dumps(dict(kind=kind, path=str(path), fixture=fixture, code=code, parentName=parent_name)),
                            text=True, capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError('offline parser rejected ' + path.name + ': ' + result.stderr[-600:])
    return json.loads(result.stdout)


def fetch(url):
    from curl_cffi import requests
    chunks, size = [], 0

    def chunk(body):
        nonlocal size
        size += len(body)
        require(size <= 8*1024*1024, 'response too large')
        chunks.append(body)

    with requests.Session(trust_env=False) as session:
        response = session.get(url, impersonate='chrome', allow_redirects=False, timeout=25, content_callback=chunk)
    return response.status_code, {k.lower(): v for k, v in response.headers.items()}, b''.join(chunks)


def collect(directory, manifest_path, ledger_path, *, max_new=950, max_leagues=139,
            now_fn=time.time, sleep_fn=time.sleep, fetch_fn=fetch, parse_fn=parse):
    os.umask(0o077)
    root, manifest_path, ledger_path = Path(directory), Path(manifest_path), Path(ledger_path)
    root.mkdir(parents=True, exist_ok=True)
    latest, status_path, cache_path, binding_path = (root/name for name in ('latest.json', 'status.json', 'captures.json', 'run.json'))
    ledger, snapshot, holds, manifest, new = None, None, None, None, 0
    holds_path = ledger_path.with_suffix('.holds.json')

    def sync_holds(at):
        if holds is None or snapshot is None:
            return
        completed = {f"{l['id']}:{fid}" for l in manifest['leagues'] for fid in l['completed']}

        def resolve(key, resolution):
            if key in holds['open']:
                old = holds['open'].pop(key)
                holds['resolved'][key] = dict(**old, resolvedAt=at, resolution=resolution)

        for key in completed:
            resolve(key, 'database-imported')
        for league in snapshot['leagues']:
            for record in league['reports']:
                resolve(f"{league['id']}:{record['fixture']['id']}", 'captured-complete')
            observations = [(f, 'source-unplayed', None) for f in league['sourceUnplayed']]
            observations += [(r['fixture'], 'report-pending', r['validation'].get('reason')) for r in league['pending']]
            for fixture, kind, reason in observations:
                key = f"{league['id']}:{fixture['id']}"
                if key in completed:
                    continue
                old = holds['open'].get(key)
                if old:
                    require(all(old.get(k) == league[k] for k in ('id', 'slug', 'code')), 'durable hold league binding changed')
                holds['open'][key] = dict(id=league['id'], slug=league['slug'], code=league['code'], fixture=fixture,
                                         kind=kind, reason=reason, firstObservedAt=old['firstObservedAt'] if old else at,
                                         lastObservedAt=at, manifestSha256=snapshot['manifestSha256'])
        holds['updatedAt'] = at
        atomic(holds_path, holds)
        entries = list(holds['open'].values())
        snapshot['holds'] = dict(openCount=len(entries), olderCount=sum(str(x['fixture'].get('datum', '')) < manifest['fromDate'] for x in entries), entries=entries)

    def save(status, reason=None):
        at = stamp(now_fn())
        sync_holds(at)
        leagues = snapshot['leagues'] if snapshot else []
        counts = dict(leagues=len(leagues), reports=sum(len(l['reports']) for l in leagues),
                      pending=sum(len(l['pending']) for l in leagues),
                      sourceUnplayedCount=sum(len(l['sourceUnplayed']) for l in leagues),
                      attempts24h=ledger.count() if ledger else None, newAttempts=new,
                      openHolds=snapshot.get('holds', {}).get('openCount') if snapshot else None,
                      olderHolds=snapshot.get('holds', {}).get('olderCount') if snapshot else None)
        heartbeat = dict(schema=2, source='hns', mode='recurring', status=status, updatedAt=at, reason=reason, **counts)
        if snapshot is not None:
            snapshot.update(status=status, reason=reason, updatedAt=at,
                            attempts24h=counts['attempts24h'], newAttempts=new, sourceUnplayedCount=counts['sourceUnplayedCount'])
            atomic(latest, snapshot)
            heartbeat.update(createdAt=snapshot['createdAt'], expiresAt=snapshot['expiresAt'], manifestSha256=snapshot['manifestSha256'])
        atomic(status_path, heartbeat)
        print(json.dumps(heartbeat), flush=True)

    try:
        require(type(max_new) is int and 1 <= max_new <= 950, 'per-run limit must be between 1 and 950')
        require(type(max_leagues) is int and 1 <= max_leagues <= 139, 'league limit must be between 1 and 139')
        raw = manifest_path.read_bytes()
        manifest = validate_manifest(json.loads(raw), now_fn())
        binding = hashlib.sha256(raw).hexdigest()
        envelope = dict(schema=2, source='hns', mode='recurring', season='2026/27', fromDate=manifest['fromDate'],
                        throughDate=manifest['toDate'], expiresAt=manifest['expiresAt'], manifestSha256=binding)
        if binding_path.exists():
            require(json.loads(binding_path.read_text()) == envelope, 'manifest changed: use a new run directory')
        else:
            require(not latest.exists() and not cache_path.exists(), 'unbound prior run: use a new run directory')
        # Shared ledger lock also serializes artifact and durable hold updates.
        require(ledger_path.parent.exists(), 'shared ledger parent must already exist')
        ledger = Ledger(ledger_path, 950, now_fn, sleep_fn)
        atomic(binding_path, envelope)
        snapshot = json.loads(latest.read_text()) if latest.exists() else dict(**envelope, createdAt=manifest['createdAt'], collectionStartedAt=stamp(now_fn()), leagues=[])
        require(all(snapshot.get(k) == v for k, v in envelope.items()), 'snapshot manifest binding changed')
        require(snapshot.get('createdAt') == manifest['createdAt'], 'snapshot creation time differs from manifest')
        seen = set()
        for old in snapshot['leagues']:
            require(old['id'] not in seen and any(all(old.get(k) == l[k] for k in ('id', 'slug', 'code')) for l in manifest['leagues']), 'snapshot league binding changed')
            seen.add(old['id'])
            require(all(isinstance(old.get(k), list) for k in ('reports', 'pending', 'sourceUnplayed')), 'invalid resumed league state')
        cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
        (root/'blobs').mkdir(exist_ok=True)
        for url, entry in cache.items():
            require(entry.get('url') == url and isinstance(entry.get('sha256'), str) and re.fullmatch(r'[a-f0-9]{64}', entry['sha256']), 'invalid capture identity')
            require(hashlib.sha256((root/'blobs'/(entry['sha256']+'.html')).read_bytes()).hexdigest() == entry['sha256'], 'capture digest mismatch')
        candidate_holds = json.loads(holds_path.read_text()) if holds_path.exists() else dict(schema=1, source='hns', season='2026/27', open={}, resolved={})
        require(isinstance(candidate_holds, dict) and all(candidate_holds.get(k) == v for k, v in dict(schema=1, source='hns', season='2026/27').items()) and isinstance(candidate_holds.get('open'), dict) and isinstance(candidate_holds.get('resolved'), dict), 'invalid durable holds ledger')
        holds = candidate_holds
        save('collecting')
        if ledger.get('blocked', ''):
            raise SourceBlocked(ledger.get('blocked'))

        def check_time():
            require(timestamp(manifest['createdAt']) <= now_fn() < timestamp(manifest['expiresAt']), 'manifest expired or clock moved backwards during collection')

        def capture(url):
            nonlocal new
            check_time()
            require(re.fullmatch(r'https://semafor\.hns\.family/(?:natjecanja|utakmice)/\d+/x/', url), 'invalid source URL')
            if ledger.get('blocked', ''):
                raise SourceBlocked(ledger.get('blocked'))
            if url in cache:
                entry = cache[url]
                path = root/'blobs'/(entry['sha256']+'.html')
                if refused(200, {}, path.read_bytes()):
                    ledger.block('cached challenge'); raise SourceBlocked('cached challenge')
                return path, entry
            if new >= max_new:
                raise BudgetExhausted('per-run attempt limit')
            attempt = ledger.reserve(url)
            # Ledger may wait for pacing: recheck expiry before touching the source.
            check_time()
            new += 1
            save('collecting')
            try:
                status, headers, body = fetch_fn(url)
            except Exception:
                ledger.finish(attempt, 0, defer=True)
                raise RuntimeError('transport failed; no automatic retry')
            headers = {k.lower(): v for k, v in headers.items()}
            if refused(status, headers, body):
                reason = f"source refusal HTTP {status}; ray={headers.get('cf-ray', 'unknown')}"
                ledger.finish(attempt, status, blocked=reason)
                raise SourceBlocked(reason)
            ledger.finish(attempt, status, defer=status >= 500)
            try:
                validate_html(status, headers, body)
            except ValueError:
                ledger.block('unexpected response requires review')
                raise
            digest = hashlib.sha256(body).hexdigest()
            path = root/'blobs'/(digest+'.html')
            if not path.exists():
                # A killed write may leave an orphan; never index it until its digest is verified.
                with path.open('xb') as stream:
                    stream.write(body)
            require(hashlib.sha256(path.read_bytes()).hexdigest() == digest, 'capture digest mismatch')
            entry = dict(url=url, sha256=digest, capturedAt=stamp(now_fn()), seeded=False)
            cache[url] = entry
            atomic(cache_path, cache)
            check_time()
            return path, entry

        for league_manifest in manifest['leagues'][:max_leagues]:
            check_time()
            league = next((x for x in snapshot['leagues'] if x['id'] == league_manifest['id']), None)
            if league and league.get('finished'):
                continue
            path, schedule_capture = capture(f"https://semafor.hns.family/natjecanja/{league_manifest['code']}/x/")
            parsed = parse_fn('schedule', path)
            parent = parsed.get('parentName')
            require(isinstance(parent, str) and re.search(r'26/27$', parent), 'current parent competition name required')
            fixtures = parsed['fixtures']
            require(isinstance(fixtures, list) and fixtures, 'empty schedule')
            require(all(isinstance(f, dict) and re.fullmatch(r'\d+', str(f.get('id', ''))) for f in fixtures), 'invalid fixture id')
            require(len({str(f['id']) for f in fixtures}) == len(fixtures), 'duplicate fixture id')
            if not league:
                league = dict(id=league_manifest['id'], slug=league_manifest['slug'], code=league_manifest['code'],
                              schedule=schedule_capture, parentName=parent, reports=[], pending=[], sourceUnplayed=[])
                snapshot['leagues'].append(league)
            require(league['schedule'] == schedule_capture and league['parentName'] == parent, 'resumed schedule binding changed')
            window = [f for f in fixtures if manifest['fromDate'] <= str(f.get('datum', '')) <= manifest['toDate']]
            league['sourceUnplayed'] = [f for f in window if not f.get('izid')]
            league['sourceUnplayedCount'] = len(league['sourceUnplayed'])
            save('collecting')
            done = set(league_manifest['completed']) | {str(r['fixture']['id']) for r in league['reports']+league['pending']}
            for fixture in window:
                fid = str(fixture['id'])
                if not fixture.get('izid') or fid in done:
                    continue
                path, entry = capture(f'https://semafor.hns.family/utakmice/{fid}/x/')
                try:
                    quality = parse_fn('report', path, fixture, league_manifest['code'], parent_name=parent)
                    require(isinstance(quality, dict) and type(quality.get('complete')) is bool, 'invalid parser quality')
                except ValueError as error:
                    quality = dict(complete=False, reason='parser-quality-hold: '+str(error))
                record = dict(fixture=fixture, capture=entry, validation=quality)
                league['reports' if quality['complete'] else 'pending'].append(record)
                save('collecting')
            league['finished'] = True
            save('collecting')
        check_time()
        finished = len(snapshot['leagues']) == 139 and all(l.get('finished') for l in snapshot['leagues'])
        status = 'paused' if not finished else ('pending' if holds['open'] or any(l['pending'] or l['sourceUnplayed'] for l in snapshot['leagues']) else 'complete')
        save(status, None if finished else 'bounded league selection is incomplete')
        return snapshot
    except BudgetExhausted as error:
        save('paused', str(error))
        return snapshot
    except BaseException as error:
        # Even malformed persisted state must produce a usable failure heartbeat.
        holds = None
        try:
            save('stopped', str(error))
        except Exception:
            atomic(status_path, dict(schema=2, source='hns', mode='recurring', status='stopped', updatedAt=stamp(now_fn()), reason=str(error)))
        raise
    finally:
        if ledger:
            ledger.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dir', required=True)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--ledger', required=True, help='Existing shared HNS ledger path; never rotate to reset budget/latch')
    parser.add_argument('--max-new', type=int, default=950)
    parser.add_argument('--max-leagues', type=int, default=139)
    args = parser.parse_args()
    result = collect(args.dir, args.manifest, args.ledger, max_new=args.max_new, max_leagues=args.max_leagues)
    return 0 if result and result['status'] in ('complete', 'pending') else 2


if __name__ == '__main__':
    raise SystemExit(main())
