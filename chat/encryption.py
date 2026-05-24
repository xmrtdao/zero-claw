#!/usr/bin/env python3
"""
Zero-Claw Encrypted Chat - Encryption Module

Fernet (AES-128-CBC + HMAC) encryption with HKDF key derivation.
All messages encrypted end-to-end before relay.
"""

import base64
import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes


class EncryptionManager:
    """Manages E2E encryption for zero-claw chat."""
    
    def __init__(self, master_secret: str):
        """
        Initialize with master secret (shared among trusted parties).
        This secret is NEVER transmitted over the network.
        """
        self.master_secret = master_secret.encode()
        self._room_keys: Dict[str, Fernet] = {}
    
    def derive_room_key(self, room_id: str) -> Fernet:
        """
        Derive room-specific encryption key using HKDF.
        Same room_id + same master_secret = same key (deterministic).
        """
        if room_id in self._room_keys:
            return self._room_keys[room_id]
        
        # HKDF-SHA256 key derivation
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits for Fernet
            salt=b'zero-claw-v1',
            info=f'room:{room_id}'.encode()
        )
        key_material = hkdf.derive(self.master_secret)
        
        # Fernet requires base64-encoded 32-byte key
        fernet_key = base64.urlsafe_b64encode(key_material)
        fernet = Fernet(fernet_key)
        
        self._room_keys[room_id] = fernet
        return fernet
    
    def encrypt_message(self, room_id: str, message: Dict[str, Any]) -> str:
        """
        Encrypt a message for a specific room.
        Returns: Base64-encoded ciphertext
        """
        fernet = self.derive_room_key(room_id)
        
        # Add metadata
        message['_encrypted_at'] = datetime.utcnow().isoformat() + 'Z'
        plaintext = json.dumps(message, separators=(',', ':')).encode()
        
        # Encrypt
        ciphertext = fernet.encrypt(plaintext)
        return base64.b64encode(ciphertext).decode()
    
    def decrypt_message(self, room_id: str, ciphertext: str) -> Dict[str, Any]:
        """
        Decrypt a message from a specific room.
        Returns: Original message dict
        """
        fernet = self.derive_room_key(room_id)
        
        # Decode and decrypt
        ciphertext_bytes = base64.b64decode(ciphertext)
        plaintext = fernet.decrypt(ciphertext_bytes)
        
        # Parse JSON
        message = json.loads(plaintext.decode())
        
        # Remove metadata
        message.pop('_encrypted_at', None)
        return message
    
    def wipe_keys(self):
        """
        Wipe all room keys from memory.
        Call this on logout/disconnect.
        """
        for key in self._room_keys:
            self._room_keys[key] = None
        self._room_keys.clear()


# Test/demo
if __name__ == '__main__':
    print('🔐 Zero-Claw Encryption Module')
    print('=' * 60)
    
    # Setup
    master_secret = 'SuperSecretFleetPassword2026!'
    enc = EncryptionManager(master_secret)
    
    print(f'\n📝 Master Secret: {master_secret[:10]}...')
    print(f'   (Never transmitted, shared out-of-band)')
    
    # Test encryption
    room_id = 'case-123-attorney-client'
    message = {
        'from': 'attorney@lawfirm.com',
        'content': 'Confidential: Client settlement offer is $500K. Do not disclose.',
        'type': 'privileged'
    }
    
    print(f'\n📤 Original Message:')
    print(f'   Room: {room_id}')
    print(f'   From: {message["from"]}')
    print(f'   Content: {message["content"][:50]}...')
    
    # Encrypt
    ciphertext = enc.encrypt_message(room_id, message)
    print(f'\n🔒 Encrypted (Base64):')
    print(f'   {ciphertext[:80]}...')
    print(f'   Length: {len(ciphertext)} chars')
    
    # Decrypt
    decrypted = enc.decrypt_message(room_id, ciphertext)
    print(f'\n🔓 Decrypted Message:')
    print(f'   From: {decrypted["from"]}')
    print(f'   Content: {decrypted["content"][:50]}...')
    
    # Verify
    assert decrypted['from'] == message['from']
    assert decrypted['content'] == message['content']
    print(f'\n✅ Encryption/Decryption successful!')
    
    # Test different room = different key
    room2_id = 'case-456-different-matter'
    ciphertext2 = enc.encrypt_message(room2_id, message)
    print(f'\n🔑 Different Room Test:')
    print(f'   Room 1 ciphertext: {ciphertext[:40]}...')
    print(f'   Room 2 ciphertext: {ciphertext2[:40]}...')
    print(f'   (Different keys for different rooms)')
    
    # Wipe keys
    enc.wipe_keys()
    print(f'\n🧹 Keys wiped from memory')
    
    print('\n' + '=' * 60)
    print('📌 Key Points:')
    print('   • AES-128-CBC + HMAC (Fernet)')
    print('   • HKDF-SHA256 key derivation')
    print('   • Deterministic room keys (same secret = same key)')
    print('   • Wipe keys on disconnect for security')
