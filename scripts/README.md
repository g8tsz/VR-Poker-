# Clean git author (no Cursor trailer)

Cursor may append `Co-authored-by: Cursor` on `git commit`. This script
creates a replacement commit with the same tree, authored as g8tsz only,
and moves the current branch to it.

Usage (from repo root, after `git add`):

    python scripts/commit_g8tsz.py "Commit title" "Optional body"
