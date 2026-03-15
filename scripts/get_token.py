#!/usr/bin/env python3
"""Get GitHub token and write to temp file, then push."""
import subprocess, sys, os

r = subprocess.run(
    ['git', 'credential', 'fill'],
    input='protocol=https\nhost=github.com\n\n',
    capture_output=True, text=True, timeout=8
)
tok = None
for line in r.stdout.splitlines():
    if line.startswith('password='):
        tok = line.split('=', 1)[1].strip()
        break

if not tok:
    print('NO_TOKEN')
    sys.exit(1)

# Write to temp file (will be deleted after use)
tmp = os.path.join(os.path.dirname(__file__), '.tok')
with open(tmp, 'w') as f:
    f.write(tok)
print(f'TOKEN_WRITTEN:{len(tok)}')
