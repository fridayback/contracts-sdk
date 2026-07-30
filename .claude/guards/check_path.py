#!/usr/bin/env python3
"""Claude Code PreToolUse path guard.
Blocks Write/Edit operations targeting files outside an allowed worktree.
"""
import sys, json, os
ALLOWED_DIR = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        print("OK"); sys.exit(0)
    file_path = data.get("file_path", "")
    if not file_path:
        print("OK"); sys.exit(0)
    abs_path = os.path.abspath(file_path)
    if abs_path.startswith(os.path.abspath(ALLOWED_DIR) + os.sep):
        print("OK"); sys.exit(0)
    if abs_path == os.path.abspath(ALLOWED_DIR):
        print("OK"); sys.exit(0)
    print(f"BLOCKED: Write outside project directory: {file_path}")
    print(f"Allowed: {ALLOWED_DIR}")
    sys.exit(2)
if __name__ == "__main__":
    main()
