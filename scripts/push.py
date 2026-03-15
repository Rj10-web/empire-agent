#!/usr/bin/env python3
import subprocess, urllib.request, urllib.error, json, os, sys

def get_token():
    r = subprocess.run(['git','credential','fill'],
        input='protocol=https\nhost=github.com\n\n',
        capture_output=True, text=True, timeout=10)
    for line in r.stdout.splitlines():
        if line.startswith('password='):
            return line.split('=',1)[1].strip()
    return None

def api(token, method, path, data=None):
    req = urllib.request.Request(
        f'https://api.github.com{path}',
        data=json.dumps(data).encode() if data else None,
        headers={'Authorization': f'token {token}',
                 'Content-Type': 'application/json',
                 'Accept': 'application/vnd.github.v3+json',
                 'User-Agent': 'empire-agent'},
        method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def main():
    print('Getting token...')
    tok = get_token()
    if not tok:
        print('ERROR: No token')
        sys.exit(1)
    print(f'Token: {tok[:12]}...')

    print('Creating repo...')
    result, code = api(tok, 'POST', '/user/repos', {
        'name': 'empire-agent',
        'description': "Roobmy Joseph's Empire Agent — Personal AI for content empire",
        'private': False
    })

    if code == 201:
        clone_url = result['clone_url']
        html_url = result['html_url']
        print(f'Created: {html_url}')
    elif code == 422 and 'already exists' in str(result):
        # Repo exists, get URL
        u, _ = api(tok, 'GET', '/user')
        username = u['login']
        clone_url = f'https://github.com/{username}/empire-agent.git'
        html_url = f'https://github.com/{username}/empire-agent'
        print(f'Repo exists: {html_url}')
    else:
        print(f'ERROR {code}: {result}')
        sys.exit(1)

    # Push
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    auth_url = clone_url.replace('https://', f'https://{tok}@')

    subprocess.run(['git','remote','remove','origin'], capture_output=True, cwd=repo_dir)
    subprocess.run(['git','remote','add','origin', auth_url], check=True, cwd=repo_dir)

    r = subprocess.run(['git','push','-u','origin','master'],
                      capture_output=True, text=True, cwd=repo_dir)
    print(r.stdout or r.stderr)

    if r.returncode == 0:
        print(f'\nSUCCESS: {html_url}')
        print(f'\nNext: Go to https://vercel.com/new')
        print(f'Import "empire-agent" repo and deploy.')
        print(f'Add env var: OPENROUTER_API_KEY')
    else:
        print(f'Push failed (code {r.returncode})')

main()
