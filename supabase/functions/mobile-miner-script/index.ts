import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PYTHON_SCRIPT = `#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import requests

# ASCII Art and Branding
XMRT_ASCII = r"""
██╗  ██╗███╗   ███╗██████╗ ████████╗
╚██╗██╔╝████╗ ████║██╔══██╗╚══██╔══╝
 ╚███╔╝ ██╔████╔██║██████╔╝   ██║   
 ██╔██╗ ██║╚██╔╝██║██╔══██╗   ██║   
██╔╝ ██╗██║ ╚═╝ ██║██║  ██║   ██║   
╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   
D E C E N T R A L I Z E D   A U T O N O M O U S   O R G A N I Z A T I O N
"""

API_BASE = "https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1"

def colorful_print(text, color_code):
    """Print colored text in Termux"""
    print(f"\\033[{color_code}m{text}\\033[0m")

def show_header():
    """Display branded welcome screen"""
    os.system('clear')
    colorful_print(XMRT_ASCII, "36")
    colorful_print("\\nWelcome to XMRT DAO Mobile Mining Initiative\\n", "33")
    colorful_print("="*60, "34")
    print()

def install_dependencies():
    """Install required Termux packages"""
    colorful_print("\\n🔧 Setting up environment...", "35")
    packages = [
        "python", "clang", "nodejs", "openssl-tool",
        "git", "cmake", "make", "libuv", "libmicrohttpd"
    ]
    
    try:
        subprocess.run("apt update && apt upgrade -y", 
                      shell=True, check=True)
        subprocess.run(f"apt install -y {' '.join(packages)}",
                      shell=True, check=True)
        colorful_print("✅ Environment setup complete!", "32")
    except subprocess.CalledProcessError as e:
        colorful_print(f"❌ Setup failed: {str(e)}", "31")
        sys.exit(1)

def register_miner(username):
    """Register with DAO via API"""
    colorful_print("\\n📝 Registering with XMRT DAO...", "36")
    
    try:
        response = requests.post(
            f"{API_BASE}/mobile-miner-register",
            json={
                "username": username,
                "device_info": "Termux/Android"
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        colorful_print(f"\\n🎉 Registration successful!", "32")
        colorful_print(f"Your Miner ID: {data['user_number']}", "33")
        
        # Save config
        with open('config.json', 'w') as f:
            f.write(data['config_json'])
        
        colorful_print("✅ Configuration saved to config.json", "32")
        return data
        
    except requests.RequestException as e:
        colorful_print(f"❌ Registration failed: {str(e)}", "31")
        sys.exit(1)

def install_miner():
    """Install and build XMRig"""
    colorful_print("\\n⛏️ Installing XMRig miner...", "33")
    try:
        if not os.path.exists("xmrig"):
            subprocess.run("git clone https://github.com/xmrig/xmrig.git",
                          shell=True, check=True)
        
        os.chdir("xmrig")
        
        if not os.path.exists("build/xmrig"):
            subprocess.run(
                "mkdir -p build && cd build && "
                "cmake .. -DWITH_HWLOC=OFF -DWITH_OPENCL=OFF -DWITH_CUDA=OFF && "
                "make -j$(nproc)",
                shell=True, check=True
            )
            colorful_print("✅ Miner installation complete!", "32")
        else:
            colorful_print("⚠️ Using existing XMRig build", "33")
            
        os.chdir("..")
    except subprocess.CalledProcessError as e:
        colorful_print(f"❌ Installation failed: {str(e)}", "31")
        sys.exit(1)

def show_instructions(data):
    """Display post-install instructions"""
    show_header()
    colorful_print("🚀 Setup Complete! Here's How to Mine:", "36")
    print("\\n1. Start mining:")
    colorful_print("   cd xmrig/build && ./xmrig -c ../../config.json", "33")
    
    print("\\n2. Track your contributions:")
    colorful_print(f"   Your unique tracker: {data['user_number']}", "35")
    colorful_print(f"   DAO Tracking Portal: {data['tracking_url']}", "34")

def main():
    show_header()
    colorful_print("This script will:", "33")
    print("- Install required packages")
    print("- Register you with XMRT DAO")
    print("- Configure automatic rewards tracking")
    print("- Set up optimized mobile mining\\n")
    
    username = input("Choose your mining alias: ").strip()
    if not username:
        colorful_print("❌ Username required", "31")
        sys.exit(1)
    
    install_dependencies()
    miner_data = register_miner(username)
    install_miner()
    show_instructions(miner_data)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        colorful_print("\\n🚫 Setup canceled by user", "31")
        sys.exit(0)
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    return new Response(
      PYTHON_SCRIPT,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="xmrt_mobile_miner.py"'
        } 
      }
    );

  } catch (error) {
    console.error('Script serve error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
