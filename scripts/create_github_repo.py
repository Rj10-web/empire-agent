#!/usr/bin/env python3
"""Create GitHub repo and push empire-agent code."""
import subprocess
import urllib.request
import urllib.error
import json
import os
import sys

# Get token from Windows credential manager via git
def get_github_token():
    try:
        input_data = "protocol=https\nhost=github.com\n\n"
        result = subprocess.run(
            ["git", "credential", "fill"],
            input=input_data, capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1]
    except Exception as e:
        print(f"Could not get token: {e}")
    return None

def create_repo(token, repo_name="empire-agent"):
    url = "https://api.github.com/user/repos"
    data = json.dumps({
        "name": repo_name,
        "description": "Roobmy Joseph's Empire Agent — Personal AI command center for content empire",
        "private": False,
        "auto_init": False,
    }).encode()

    req = urllib.request.Request(
        url, data=data,
        headers={
            "Authorization": f"token {token}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "empire-agent/1.0",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            result = json.loads(res.read())
            return result.get("html_url"), result.get("clone_url")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        if "already exists" in body.get("errors", [{}])[0].get("message", ""):
            print("Repo already exists, continuing...")
            # Get existing repo URL
            req2 = urllib.request.Request(
                "https://api.github.com/user",
                headers={"Authorization": f"token {token}", "User-Agent": "empire-agent/1.0"}
            )
            with urllib.request.urlopen(req2, timeout=10) as r:
                user = json.loads(r.read())
                username = user["login"]
                return (
                    f"https://github.com/{username}/{repo_name}",
                    f"https://github.com/{username}/{repo_name}.git"
                )
        raise

def push_to_github(clone_url, token):
    # Inject token into URL for auth
    auth_url = clone_url.replace("https://", f"https://{token}@")

    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Set remote
    subprocess.run(["git", "remote", "remove", "origin"],
                  capture_output=True, cwd=repo_dir)
    subprocess.run(["git", "remote", "add", "origin", auth_url],
                  check=True, cwd=repo_dir)

    # Push
    result = subprocess.run(
        ["git", "push", "-u", "origin", "master"],
        capture_output=True, text=True, cwd=repo_dir
    )
    if result.returncode != 0:
        # Try main branch
        result = subprocess.run(
            ["git", "push", "-u", "origin", "master:main"],
            capture_output=True, text=True, cwd=repo_dir
        )
    return result.returncode == 0


if __name__ == "__main__":
    print("\n" + "="*50)
    print("  Empire Agent — GitHub Setup")
    print("="*50 + "\n")

    print("Getting GitHub credentials...")
    token = get_github_token()
    if not token:
        print("ERROR: Could not get GitHub token.")
        print("Run: git config --global credential.helper manager-core")
        sys.exit(1)

    print(f"Got token: {token[:8]}***")

    print("\nCreating GitHub repository...")
    html_url, clone_url = create_repo(token)
    print(f"Repo: {html_url}")

    print("\nPushing code to GitHub...")
    success = push_to_github(clone_url, token)

    if success:
        print(f"\n{'='*50}")
        print(f"  SUCCESS!")
        print(f"  GitHub: {html_url}")
        print(f"\n  Next: Connect Vercel to this repo at:")
        print(f"  https://vercel.com/new")
        print(f"  Select 'empire-agent' and deploy.")
        print(f"  Add env var: OPENROUTER_API_KEY")
        print(f"{'='*50}\n")
    else:
        print("Push failed. Try manually.")
