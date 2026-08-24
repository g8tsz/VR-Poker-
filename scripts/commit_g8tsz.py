#!/usr/bin/env python3
"""Create a commit as g8tsz with no Co-authored-by trailer."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
GIT = r"C:\Program Files\Git\bin\git.exe"
AUTHOR_NAME = "g8tsz"
AUTHOR_EMAIL = "197989271+g8tsz@users.noreply.github.com"


def git(*args: str) -> str:
    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = AUTHOR_NAME
    env["GIT_AUTHOR_EMAIL"] = AUTHOR_EMAIL
    env["GIT_COMMITTER_NAME"] = AUTHOR_NAME
    env["GIT_COMMITTER_EMAIL"] = AUTHOR_EMAIL
    r = subprocess.run([GIT, *args], cwd=REPO, env=env, check=True, capture_output=True, text=True)
    return (r.stdout or "").strip()


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python scripts/commit_g8tsz.py \"title\" [body]")
        sys.exit(2)
    title = sys.argv[1]
    body = sys.argv[2] if len(sys.argv) > 2 else ""
    msg = title if not body else f"{title}\n\n{body}\n"
    msg_path = REPO / ".git" / "COMMIT_MSG_CLEAN.txt"
    msg_path.write_text(msg, encoding="utf-8")

    staged = git("diff", "--cached", "--name-only")
    if not staged:
        git("add", "-A")
        staged = git("diff", "--cached", "--name-only")
    if not staged:
        print("nothing to commit")
        sys.exit(1)

    # Index -> tree, then commit-tree so no hook can inject a trailer.
    git("write-tree")
    tree = git("write-tree")
    head = git("rev-parse", "HEAD")
    new = git("commit-tree", tree, "-p", head, "-F", str(msg_path))
    if "Co-authored-by" in git("cat-file", "-p", new):
        raise SystemExit("trailer leaked into commit")
    branch = git("symbolic-ref", "--short", "HEAD")
    git("update-ref", f"refs/heads/{branch}", new)
    print(new)
    print(git("log", "-1", "--format=full"))


if __name__ == "__main__":
    main()
