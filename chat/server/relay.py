#!/usr/bin/env python3
"""
Zero-Claw Encrypted Chat - WebSocket Relay Server

Minimal relay server that forwards encrypted messages WITHOUT logging content.
All messages are ciphertext - server cannot read or store them.

Usage:
    python server.py serve 0.0.0.0 8443 --password <shared_secret>
"""

import asyncio
import websockets
import json
import argparse
import logging
from datetime import datetime
from typing import Dict, Set
from pathlib import Path

# Configure logging - ONLY metadata, NEVER message content
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        # NO file handler - we don't log to disk!
    ]
)
logger = logging.getLogger('zero-claw-relay')


class RelayServer:
    """
    WebSocket relay for encrypted chat.
    
    CRITICAL: This server:
    - Forwards ciphertext only (cannot decrypt)
    - Logs NO message content
    - Stores NOTHING to disk
    - Wipes all data on shutdown
    """
    
    def __init__(self):
        self.rooms: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}
        self.user_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self._shutdown = False
    
    async def register(self, websocket: websockets.WebSocketServerProtocol, username: str, room_id: str):
        """Register a user in a room."""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(websocket)
        self.user_connections[username] = websocket
        
        logger.info(f"User '{username}' joined room '{room_id}' (users: {len(self.rooms[room_id])})")
        
        # Send welcome message
        await websocket.send(json.dumps({
            'type': 'welcome',
            'username': username,
            'room': room_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }))
    
    async def unregister(self, websocket: websockets.WebSocketServerProtocol):
        """Unregister a user from all rooms."""
        username = None
        for room_id, users in self.rooms.items():
            if websocket in users:
                users.remove(websocket)
                logger.info(f"User left room '{room_id}' (users: {len(users)})")
        
        # Remove from user connections
        for uname, ws in list(self.user_connections.items()):
            if ws == websocket:
                username = uname
                del self.user_connections[uname]
                break
        
        if username:
            logger.info(f"User '{username}' disconnected")
    
    async def broadcast(self, room_id: str, message: str, sender: websockets.WebSocketServerProtocol):
        """
        Broadcast encrypted message to all users in room.
        
        NOTE: 'message' is ciphertext - we cannot and do not read it.
        We just forward the bytes.
        """
        if room_id not in self.rooms:
            return
        
        # Create broadcast packet
        packet = json.dumps({
            'type': 'message',
            'room': room_id,
            'payload': message,  # Ciphertext (we can't read it)
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
        
        # Send to all users in room (including sender for confirmation)
        disconnected = set()
        for websocket in self.rooms[room_id]:
            try:
                await websocket.send(packet)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
        
        # Clean up disconnected users
        for ws in disconnected:
            await self.unregister(ws)
        
        logger.debug(f"Broadcast to room '{room_id}' ({len(self.rooms[room_id])} users)")
    
    async def handle_client(self, websocket: websockets.WebSocketServerProtocol):
        """Handle a single client connection."""
        username = None
        room_id = None
        
        try:
            async for raw_message in websocket:
                try:
                    message = json.loads(raw_message)
                    msg_type = message.get('type')
                    
                    if msg_type == 'join':
                        username = message.get('username')
                        room_id = message.get('room')
                        await self.register(websocket, username, room_id)
                    
                    elif msg_type == 'message':
                        if room_id:
                            await self.broadcast(room_id, message.get('payload'), websocket)
                    
                    elif msg_type == 'leave':
                        if room_id:
                            await self.unregister(websocket)
                            room_id = None
                    
                    elif msg_type == 'ping':
                        await websocket.send(json.dumps({'type': 'pong'}))
                    
                    else:
                        logger.warning(f"Unknown message type: {msg_type}")
                
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON received")
        
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client connection closed")
        
        finally:
            if websocket in self.user_connections.values():
                await self.unregister(websocket)
    
    async def shutdown(self):
        """Graceful shutdown - wipe all state."""
        logger.info("Shutting down relay server...")
        self._shutdown = True
        
        # Clear all rooms (RAM-only, nothing on disk)
        self.rooms.clear()
        self.user_connections.clear()
        
        logger.info("All state wiped from memory")


async def main(host: str, port: int):
    """Run the relay server."""
    server = RelayServer()
    
    logger.info(f"🦑 Zero-Claw Relay Server starting on {host}:{port}")
    logger.info("📌 IMPORTANT: This server logs NO message content")
    logger.info("📌 All data is RAM-only, wiped on shutdown")
    
    async with websockets.serve(
        server.handle_client,
        host,
        port,
        ping_interval=30,
        ping_timeout=10
    ):
        try:
            await asyncio.Future()  # Run forever
        except asyncio.CancelledError:
            await server.shutdown()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Zero-Claw Encrypted Chat Relay')
    parser.add_argument('command', choices=['serve'], help='Server command')
    parser.add_argument('host', help='Host to bind (e.g., 0.0.0.0)')
    parser.add_argument('port', type=int, help='Port to listen on')
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        print('\n👋 Server stopped')
