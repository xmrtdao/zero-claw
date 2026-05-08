#!/usr/bin/env python3
"""
supabase_deploy.py — Deploy edge functions to Supabase from Termux/Android
Uses Supabase Management API (no CLI required).

Usage:
    export SUPABASE_ACCESS_TOKEN=sbp_...
    export SUPABASE_PROJECT_REF=vawouugtzwmejxqkeqqj
    python3 supabase_deploy.py

Requirements: Python 3, requests (or urllib), zipfile
"""
import os, sys, json, zipfile, io, base64

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system("pip install requests -q")
    import requests

PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF', 'vawouugtzwmejxqkeqqj')
TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
BASE_URL = f'https://api.supabase.com/v1/projects/{PROJECT_REF}'
HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

FUNCTIONS = [
    'propose-action',
    'submit-vote',
    'tally-votes',
    'check-vote',
    'eliza-direct',
]

def zip_function(func_name, source_dir):
    """Zip a function directory for upload."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        func_path = os.path.join(source_dir, func_name)
        if os.path.isdir(func_path):
            for root, dirs, files in os.walk(func_path):
                for f in files:
                    full = os.path.join(root, f)
                    arc = os.path.relpath(full, source_dir)
                    zf.write(full, arc)
        else:
            # Single file
            idx = os.path.join(source_dir, 'index.ts')
            if os.path.exists(idx):
                zf.write(idx, 'index.ts')
    buf.seek(0)
    return buf.read()

def deploy_function(func_name, source_dir='~/xmrt_dao/zero_claw/supabase/functions'):
    source_dir = os.path.expanduser(source_dir)
    print(f'\n🚀 Deploying {func_name}...')
    
    # Create/update function metadata
    url = f'{BASE_URL}/functions/{func_name}'
    
    # Get existing function to check if update needed
    r = requests.get(url, headers=HEADERS, timeout=30)
    if r.status_code == 404:
        print(f'  Creating new function {func_name}...')
    elif r.status_code == 200:
        print(f'  Updating existing function {func_name}...')
    else:
        print(f'  Error checking function: {r.status_code} {r.text[:200]}')
        return False
    
    # Bundle and deploy
    zip_data = zip_function(func_name, source_dir)
    
    deploy_headers = {
        'Authorization': f'Bearer {TOKEN}',
    }
    
    files = {
        'file': (f'{func_name}.zip', zip_data, 'application/zip')
    }
    
    # Supabase uses a special deploy endpoint
    deploy_url = f'{BASE_URL}/functions/{func_name}/deploy'
    r = requests.post(deploy_url, headers=deploy_headers, files=files, timeout=60)
    
    if r.status_code in [200, 201]:
        print(f'  ✅ {func_name} deployed successfully!')
        return True
    else:
        print(f'  ❌ Deploy failed: {r.status_code} {r.text[:500]}')
        return False

def apply_schema():
    """Apply database schema via Supabase REST API."""
    print('\n🗄️  Applying database schema...')
    
    schema_path = os.path.expanduser('~/xmrt_dao/zero_claw/supabase/schema.sql')
    if not os.path.exists(schema_path):
        print(f'  Schema not found at {schema_path}')
        return False
    
    with open(schema_path) as f:
        schema_sql = f.read()
    
    # Use the PostgreSQL REST API to execute SQL
    # Note: This requires the pgrest service to have exec access
    pg_url = f'https://{PROJECT_REF}.supabase.co/rest/v1/'
    pg_headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    # Actually we need to use the Supabase SQL API
    sql_url = f'https://{PROJECT_REF}.supabase.co/pgrest/v1/rpc/exec_sql'
    r = requests.post(sql_url, headers=pg_headers, json={'query': schema_sql}, timeout=30)
    
    if r.status_code in [200, 201]:
        print('  ✅ Schema applied!')
        return True
    else:
        print(f'  ⚠️  Schema apply returned {r.status_code}. May need manual apply via dashboard.')
        print(f'     {r.text[:300]}')
        return False

def main():
    if not TOKEN:
        print("❌ SUPABASE_ACCESS_TOKEN not set!")
        print("Get it from: https://supabase.com/dashboard/account/tokens")
        sys.exit(1)
    
    print(f"🦑 ZeroClaw Supabase Deploy")
    print(f"Project: {PROJECT_REF}")
    print(f"Functions: {len(FUNCTIONS)}")
    
    # Test auth
    r = requests.get(f'{BASE_URL}', headers=HEADERS, timeout=10)
    if r.status_code != 200:
        print(f"❌ Auth failed: {r.status_code}")
        print(f"Response: {r.text[:500]}")
        sys.exit(1)
    
    print("✅ Auth OK\n")
    
    results = {}
    for func in FUNCTIONS:
        results[func] = deploy_function(func)
    
    # Try schema
    schema_ok = apply_schema()
    
    print("\n" + "="*50)
    print("DEPLOYMENT SUMMARY")
    print("="*50)
    for func, ok in results.items():
        status = "✅" if ok else "❌"
        print(f"{status} {func}")
    
    print(f"\nSchema: {'✅' if schema_ok else '⚠️  manual needed'}")
    
    all_ok = all(results.values())
    print(f"\nOverall: {'🎉 All functions deployed!' if all_ok else '⚠️  Some functions failed'}")
    
    # Print endpoints
    print("\nEndpoints:")
    for func in FUNCTIONS:
        print(f"  https://{PROJECT_REF}.supabase.co/functions/v1/{func}")

if __name__ == '__main__':
    main()
