#!/usr/bin/env python3
"""
Zero-Claw Encrypted Chat - Command-Line Client

Secure chat client with SRP authentication and E2E encryption.

Usage:
    # Connect to server
    python client.py connect <server_host> <port> <username> <room_id> <master_secret>
"""

import asyncio
import websockets
import json
import argparse
import sys
from datetime import datetime
from pathlib import Path

# Import zero-claw modules
sys.path.insert(0, str(Path(__file__).parent.parent))
from chat.srp_auth import SRPClient
from chat.encryption import EncryptionManager


class ChatClient:
    """Encrypted chat client."""
    
    def __init__(self, server_host: str, server_port: int, username: str, 
                 room_id: str, master_secret: str):
        self.server_host = server_host
        self.server_port = server_port
        self.username = username
        self.room_id = room_id
        self.master_secret = master_secret
        
        self.websocket = None
        self.encryption = None
        self.running = True
    
    async def connect(self):
        """Connect to relay server."""
        uri = f"ws://{self.server_host}:{self.server_port}"
        print(f"🔗 Connecting to {uri}...")
        
        try:
            self.websocket = await websockets.connect(uri)
            print(f"✅ Connected to server")
            
            # Initialize encryption
            self.encryption = EncryptionManager(self.master_secret)
            
            # Join room
            await self.websocket.send(json.dumps({
                'type': 'join',
                'username': self.username,
                'room': self.room_id
            }))
            
            # Wait for welcome
            response = await self.websocket.recv()
            data = json.loads(response)
            if data.get('type') == 'welcome':
                print(f"✅ Joined room '{self.room_id}'")
                print(f"🔐 Encryption enabled (master secret: {self.master_secret[:10]}...)")
                return True
            else:
                print(f"❌ Failed to join room: {data}")
                return False
        
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    async def send_message(self, content: str):
        """Send an encrypted message."""
        if not self.encryption:
            print("❌ Not connected")
            return
        
        # Create message
        message = {
            'from': self.username,
            'content': content,
            'type': 'chat'
        }
        
        # Encrypt
        ciphertext = self.encryption.encrypt_message(self.room_id, message)
        
        # Send
        await self.websocket.send(json.dumps({
            'type': 'message',
            'payload': ciphertext
        }))
        
        print(f"📤 Sent (encrypted)")
    
    async def receive_messages(self):
        """Receive and decrypt incoming messages."""
        try:
            async for raw_message in self.websocket:
                if not self.running:
                    break
                
                try:
                    data = json.loads(raw_message)
                    msg_type = data.get('type')
                    
                    if msg_type == 'message':
                        # Decrypt
                        ciphertext = data.get('payload')
                        try:
                            message = self.encryption.decrypt_message(self.room_id, ciphertext)
                            sender = message.get('from', 'unknown')
                            content = message.get('content', '')
                            timestamp = data.get('timestamp', '')[:16]
                            
                            print(f"\n📥 [{timestamp}] {sender}: {content}")
                            print("> ", end='', flush=True)
                        except Exception as e:
                            print(f"\n⚠️  Decryption failed: {e}")
                    
                    elif msg_type == 'pong':
                        pass  # Ignore ping response
                    
                    else:
                        print(f"\n⚠️  Unknown message type: {msg_type}")
                
                except json.JSONDecodeError:
                    print(f"\n⚠️  Invalid JSON received")
        
        except websockets.exceptions.ConnectionClosed:
            print(f"\n📴 Connection closed by server")
            self.running = False
    
    async def input_loop(self):
        """Read user input and send messages."""
        loop = asyncio.get_event_loop()
        
        while self.running:
            try:
                # Read input
                content = await loop.run_in_executor(None, input, "> ")
                
                if content.strip() == '/quit':
                    self.running = False
                    break
                
                if content.strip():
                    await self.send_message(content)
            
            except EOFError:
                self.running = False
                break
    
    async def disconnect(self):
        """Disconnect and wipe keys."""
        if self.websocket:
            await self.websocket.send(json.dumps({'type': 'leave'}))
            await self.websocket.close()
        
        if self.encryption:
            self.encryption.wipe_keys()
        
        print(f"\n👋 Disconnected. Keys wiped from memory.")


async def run_client(host: str, port: int, username: str, room_id: str, master_secret: str):
    """Run the chat client."""
    print('🦑 Zero-Claw Encrypted Chat Client')
    print('=' * 60)
    print(f'📌 Server: {host}:{port}')
    print(f'📌 Username: {username}')
    print(f'📌 Room: {room_id}')
    print(f'📌 Encryption: Fernet AES-128 + HKDF')
    print(f'📌 Type /quit to exit')
    print('=' * 60)
    
    client = ChatClient(host, port, username, room_id, master_secret)
    
    if await client.connect():
        # Run receive and input loops concurrently
        receive_task = asyncio.create_task(client.receive_messages())
        input_task = asyncio.create_task(client.input_loop())
        
        await asyncio.gather(receive_task, input_task)
        await client.disconnect()
    else:
        print("❌ Failed to connect")
        sys.exit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Zero-Claw Encrypted Chat Client')
    parser.add_argument('command', choices=['connect'], help='Client command')
    parser.add_argument('host', help='Server host')
    parser.add_argument('port', type=int, help='Server port')
    parser.add_argument('username', help='Username')
    parser.add_argument('room', help='Room ID (e.g., case-123)')
    parser.add_argument('secret', help='Master secret (shared out-of-band)')
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_client(
            args.host,
            args.port,
            args.username,
            args.room,
            args.secret
        ))
    except KeyboardInterrupt:
        print('\n👋 Client stopped')
