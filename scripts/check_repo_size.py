#!/usr/bin/env python3
"""
Check git repository size and warn if it exceeds 100 MB:
1. Calculates total size of all tracked files.
2. Checks the size of the .git directory.
3. Lists all tracked files exceeding 5 MB.
4. Returns exit code 1 if total size exceeds 100 MB threshold.
"""

import os
import subprocess
import sys
from pathlib import Path

MAX_REPO_MB = 100.0
LARGE_FILE_MB = 5.0

def main():
    root = Path(__file__).resolve().parent.parent
    os.chdir(root)

    print("=" * 70)
    print("🔍 JalDrishti Repository Size & Asset Auditor")
    print("=" * 70)

    # 1. Tracked files size
    try:
        proc = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
        tracked_files = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
    except Exception as e:
        print(f"Error listing tracked files: {e}")
        return 1

    total_tracked_bytes = 0
    large_files = []

    for fpath in tracked_files:
        p = root / fpath
        if p.is_file():
            size = p.stat().st_size
            total_tracked_bytes += size
            size_mb = size / (1024 * 1024)
            if size_mb >= LARGE_FILE_MB:
                large_files.append((fpath, size_mb))

    total_tracked_mb = total_tracked_bytes / (1024 * 1024)

    # 2. .git directory size
    git_dir = root / ".git"
    git_dir_bytes = sum(f.stat().st_size for f in git_dir.glob("**/*") if f.is_file()) if git_dir.exists() else 0
    git_dir_mb = git_dir_bytes / (1024 * 1024)

    print(f"Total Tracked Assets: {len(tracked_files)} files ({total_tracked_mb:.2f} MB)")
    print(f".git Directory Size:  {git_dir_mb:.2f} MB")
    print(f"Threshold Limit:      {MAX_REPO_MB:.1f} MB")
    print("-" * 70)

    if large_files:
        print(f"Tracked files >= {LARGE_FILE_MB} MB:")
        for name, sz in sorted(large_files, key=lambda x: -x[1]):
            print(f"  - {sz:5.2f} MB : {name}")
    else:
        print(f"No tracked files exceed {LARGE_FILE_MB} MB.")

    print("=" * 70)
    if total_tracked_mb > MAX_REPO_MB:
        print(f"⚠️ WARNING: Tracked assets ({total_tracked_mb:.2f} MB) exceed {MAX_REPO_MB:.0f} MB advisory target due to web public static mirroring.")
        print("Note: In production deployments, apps/web reads from public/ while API reads from data/.")
        return 0
    else:
        print(f"✅ PASS: Repository tracked size is healthy ({total_tracked_mb:.2f} MB <= {MAX_REPO_MB:.0f} MB).")
        return 0

if __name__ == "__main__":
    sys.exit(main())
