#!/usr/bin/env python3
"""
ZeroClaw + Suite — Bulk Edge Function Deployer

Deploys all 199 Supabase edge functions in batches.
Usage: python3 supabase_deploy.py [--batch N] [--dry-run]
"""

import subprocess, os, sys, json, time
from pathlib import Path

FUNCTIONS_DIR = Path("supabase/functions")
BATCH_SIZE = 10  # Deploy N functions at a time
DEPLOYED_LOG = ".deployed_functions.json"

def get_functions():
    """Get all edge function directories (exclude _shared)."""
    return sorted([
        d.name for d in FUNCTIONS_DIR.iterdir()
        if d.is_dir() and d.name != "_shared" and not d.name.startswith(".")
    ])

def load_deployed():
    if os.path.exists(DEPLOYED_LOG):
        with open(DEPLOYED_LOG) as f:
            return set(json.load(f))
    return set()

def save_deployed(deployed):
    with open(DEPLOYED_LOG, "w") as f:
        json.dump(sorted(deployed), f, indent=2)

def deploy_function(name, dry_run=False):
    if dry_run:
        print(f"  [DRY-RUN] Would deploy: {name}")
        return True

    result = subprocess.run(
        ["supabase", "functions", "deploy", name],
        capture_output=True, text=True, timeout=120
    )

    if result.returncode == 0:
        print(f"  ✅ {name}")
        return True
    else:
        error = result.stderr.strip()[:200]
        print(f"  ❌ {name}: {error}")
        return False

def main():
    dry_run = "--dry-run" in sys.argv
    custom_batch = None

    for arg in sys.argv[1:]:
        if arg.startswith("--batch="):
            custom_batch = int(arg.split("=")[1])

    batch = custom_batch or BATCH_SIZE
    functions = get_functions()
    deployed = load_deployed()
    remaining = [f for f in functions if f not in deployed]

    print(f"ZeroClaw + Suite — Edge Function Deployer")
    print(f"Total functions: {len(functions)}")
    print(f"Already deployed: {len(deployed)}")
    print(f"Remaining: {len(remaining)}")
    print(f"Batch size: {batch}")
    if dry_run:
        print(f"Mode: DRY RUN (no actual deployments)\n")

    if not remaining:
        print("All functions deployed!")
        return

    # Deploy in batches
    for i in range(0, len(remaining), batch):
        batch_fns = remaining[i:i+batch]
        print(f"\nBatch {i//batch + 1}/{(len(remaining)-1)//batch + 1}:")

        for fn in batch_fns:
            if deploy_function(fn, dry_run):
                if not dry_run:
                    deployed.add(fn)
                    save_deployed(deployed)
            time.sleep(0.5)  # Rate limit between deploys

    # Summary
    if not dry_run:
        failed = len(functions) - len(deployed)
        print(f"\nDone! {len(deployed)}/{len(functions)} deployed ({failed} failed)")
        if failed > 0:
            print(f"Rerun to retry failed functions.")
    else:
        print(f"\nDry run complete. Would deploy {len(remaining)} functions.")

if __name__ == "__main__":
    main()
