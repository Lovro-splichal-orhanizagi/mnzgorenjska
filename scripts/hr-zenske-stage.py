"""Bounded extraction of a reviewed HNS packet. No source or network access."""
import pathlib
import re
import sys
import tarfile

archive, destination = map(pathlib.Path, sys.argv[1:])
if destination.exists() or destination.is_symlink():
    raise ValueError('HNS archive destination must be new')
with tarfile.open(archive, 'r:gz') as source:
    members, names, total = [], set(), 0
    for member in source:
        name = member.name.rstrip('/') if member.isdir() else member.name
        if len(members) >= 135 or name in names:
            raise ValueError('HNS archive duplicate/too many members')
        names.add(name)
        if member.isdir() and name == 'documents':
            members.append(member)
            continue
        if not member.isfile() or not (name == 'manifest.json' or re.fullmatch(r'documents/(match|schedule)-[1-9][0-9]*\.html', name)):
            raise ValueError('HNS archive unsafe member/path/link')
        limit = 10_000_000 if name == 'manifest.json' else 2_000_000
        total += member.size
        if member.size < 0 or member.size > limit or total > 128_000_000:
            raise ValueError('HNS archive oversized payload')
        members.append(member)
    if 'manifest.json' not in names or not any(n.startswith('documents/') for n in names):
        raise ValueError('HNS archive missing packet files')
    destination.mkdir(mode=0o700)
    (destination / 'documents').mkdir(mode=0o700)
    for member in members:
        if member.isdir():
            continue
        with source.extractfile(member) as data, (destination / member.name).open('xb') as output:
            output.write(data.read())
        (destination / member.name).chmod(0o600)
