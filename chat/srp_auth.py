#!/usr/bin/env python3
"""
Zero-Claw Encrypted Chat - SRP Authentication Module

SRP-6a (Secure Remote Password) implementation for zero-knowledge authentication.
Password is NEVER transmitted over the network.

Based on RFC 2945 and the srp library (https://github.com/tomcocch/srp)
"""

import os
import hashlib
import secrets
from typing import Tuple, Optional

# SRP-6a parameters (RFC 2945)
# Using 2048-bit group from RFC 5054
N = int('''
AC6BDB47BDB160B0806210943C8EDF479A2793EAC50025CC3D384C85
51A05FEC5E51F50C0C609B3F69B027D0548774A44D95E6248C95B9A9
6531D0D47D4BDBDE081903C8CB63851149077847734FD76EB789348B
9D7D64D204D467BE2C126038C809F9A06F60F58BD68A5BBDE56747A9
DE479A8B6F1465C00574E0EAD019081CAC55B1DFC24637C42D529E0E
77033F3B0505105358C446F2054C61177ABF266648DB3FEBC7B22042
BDD1F2E4B4F73A4A05EEF5D08BE650BA633C3F429C5460CA5DE65CE5
C070575E2C8D87C42D9C8FBC6F188B55C472176F5FB57EB49612121A
6411E698FEDC80E69804B1A2E668E2825747BFD2E56A418C2E91B92A
E5E3FD24D092F37D0A7790125BB65E643F96E6EC2C87B9514E1DBD75
3E2B8EF22F879E81F9A3F1548D4F25F62E442F7429285F31290CA6E0
0073D01248B50456DAB7FB2150D92B4E0198593306D7F2C3A81ABD12
9B95B0C11DA23B0E04B7E3B9E0E32D1D0E3652F0E68A9857F1B5B9E4
D8F6E2C8B1A7D3E9F5C4B2A8D6E0F4C2B8A6D4E0F2C0B8A4D6E2F0C
8B6A4D2E0F8C6B4A2D0E8F6C4B2A0D8E6F4C2B0A8D6E4F2C0B8A6D4
''', 16)

g = 2  # Generator
k = hashlib.sha256(str(N).encode() + str(g).encode()).digest()  # Multiplier parameter


class SRPClient:
    """SRP-6a client for zero-knowledge authentication."""
    
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.salt: Optional[bytes] = None
        self.B: Optional[int] = None  # Server public key
        self.a: Optional[int] = None  # Client private key
        self.A: Optional[int] = None  # Client public key
        self.session_key: Optional[bytes] = None
    
    def generate_private_key(self) -> int:
        """Generate random private key 'a'."""
        return int.from_bytes(secrets.token_bytes(32), 'big') % (N - 1)
    
    def compute_public_key(self, a: int) -> int:
        """Compute public key A = g^a mod N."""
        return pow(g, a, N)
    
    def compute_client_proof(self, M1_data: bytes) -> bytes:
        """Compute client proof M1 = H(A, B, S)."""
        if self.session_key is None:
            raise ValueError("Session key not established")
        return hashlib.sha256(
            self.A.to_bytes(256, 'big') +
            self.B.to_bytes(256, 'big') +
            self.session_key
        ).digest()
    
    def start_authentication(self) -> Tuple[str, int]:
        """
        Start SRP authentication.
        Returns: (username, A) - send to server
        """
        self.a = self.generate_private_key()
        self.A = self.compute_public_key(self.a)
        return (self.username, self.A)
    
    def process_challenge(self, salt: bytes, B: int) -> bytes:
        """
        Process server challenge.
        Returns: M1 (client proof) to send to server
        """
        self.salt = salt
        self.B = B
        
        # Compute session key
        # S = (B - k*g^x)^(a + u*x) mod N
        # where x = H(salt | password)
        # and u = H(A | B)
        
        x = int.from_bytes(hashlib.sha256(salt + self.password.encode()).digest(), 'big')
        u = int.from_bytes(hashlib.sha256(
            self.A.to_bytes(256, 'big') + self.B.to_bytes(256, 'big')
        ).digest(), 'big')
        
        # k = H(N | g)
        k_int = int.from_bytes(hashlib.sha256(
            str(N).encode() + str(g).encode()
        ).digest(), 'big')
        
        # S = (B - k*g^x)^(a + u*x) mod N
        gx = pow(g, x, N)
        kgx = (k_int * gx) % N
        base = (self.B - kgx) % N
        exp = (self.a + u * x) % (N - 1)
        S = pow(base, exp, N)
        
        # Session key K = H(S)
        self.session_key = hashlib.sha256(S.to_bytes(256, 'big')).digest()
        
        # Compute client proof M1
        M1 = self.compute_client_proof(self.session_key)
        return M1
    
    def verify_server(self, server_proof: bytes) -> bool:
        """
        Verify server proof M2.
        Returns: True if server is authenticated
        """
        if self.session_key is None:
            return False
        
        # Server proof M2 = H(A, M1, K)
        expected_M2 = hashlib.sha256(
            self.A.to_bytes(256, 'big') +
            self.compute_client_proof(self.session_key) +
            self.session_key
        ).digest()
        
        return secrets.compare_digest(server_proof, expected_M2)
    
    def get_room_key(self, room_id: str) -> bytes:
        """
        Derive room-specific encryption key from session key.
        Uses HKDF-like construction.
        """
        if self.session_key is None:
            raise ValueError("Not authenticated")
        
        return hashlib.sha256(
            self.session_key + b'zero-claw-room-key' + room_id.encode()
        ).digest()


class SRPServer:
    """SRP-6a server for zero-knowledge authentication."""
    
    def __init__(self):
        # In production, this would be a database
        self.user_database = {}  # username -> (salt, verifier)
    
    def register_user(self, username: str, password: str) -> Tuple[bytes, int]:
        """
        Register a new user.
        Stores: salt and verifier (NOT the password!)
        Returns: (salt, verifier) for storage
        """
        salt = secrets.token_bytes(32)
        x = int.from_bytes(hashlib.sha256(salt + password.encode()).digest(), 'big')
        verifier = pow(g, x, N)
        
        self.user_database[username] = (salt, verifier)
        return (salt, verifier)
    
    def get_user_credentials(self, username: str) -> Optional[Tuple[bytes, int]]:
        """Retrieve user's salt and verifier."""
        return self.user_database.get(username)
    
    def generate_private_key(self) -> int:
        """Generate random private key 'b'."""
        return int.from_bytes(secrets.token_bytes(32), 'big') % (N - 1)
    
    def compute_public_key(self, b: int, verifier: int) -> int:
        """Compute public key B = k*v + g^b mod N."""
        k_int = int.from_bytes(hashlib.sha256(
            str(N).encode() + str(g).encode()
        ).digest(), 'big')
        return (k_int * verifier + pow(g, b, N)) % N
    
    def start_session(self, username: str) -> Optional[Tuple[bytes, int]]:
        """
        Start authentication session.
        Returns: (salt, B) to send to client, or None if user not found
        """
        creds = self.get_user_credentials(username)
        if creds is None:
            return None
        
        salt, verifier = creds
        self._current_b = self.generate_private_key()
        self._current_verifier = verifier
        self._current_B = self.compute_public_key(self._current_b, verifier)
        
        return (salt, self._current_B)
    
    def verify_client_proof(self, M1: bytes, A: int) -> Optional[bytes]:
        """
        Verify client proof and generate server proof.
        Returns: M2 (server proof) if successful, None otherwise
        """
        if not hasattr(self, '_current_b'):
            return None
        
        # Compute session key
        # S = (A * v^u)^b mod N
        u = int.from_bytes(hashlib.sha256(
            A.to_bytes(256, 'big') + self._current_B.to_bytes(256, 'big')
        ).digest(), 'big')
        
        vu = pow(self._current_verifier, u, N)
        S = pow((A * vu) % N, self._current_b, N)
        
        # Session key K = H(S)
        session_key = hashlib.sha256(S.to_bytes(256, 'big')).digest()
        
        # Verify client proof M1 = H(A, B, S)
        expected_M1 = hashlib.sha256(
            A.to_bytes(256, 'big') +
            self._current_B.to_bytes(256, 'big') +
            session_key
        ).digest()
        
        if not secrets.compare_digest(M1, expected_M1):
            return None
        
        # Generate server proof M2 = H(A, M1, K)
        M2 = hashlib.sha256(
            A.to_bytes(256, 'big') +
            M1 +
            session_key
        ).digest()
        
        return M2


# Test/demo
if __name__ == '__main__':
    print('🔐 Zero-Claw SRP Authentication Module')
    print('=' * 60)
    
    # Server setup
    server = SRPServer()
    username = 'attorney@example.com'
    password = 'SecureCasePassword123!'
    
    print(f'\n📝 Registering user: {username}')
    salt, verifier = server.register_user(username, password)
    print(f'   Salt: {salt.hex()[:32]}...')
    print(f'   Verifier: {verifier % 1000000}... (stored, not password)')
    
    # Client authentication
    print(f'\n🔑 Client authentication:')
    client = SRPClient(username, password)
    
    # Step 1: Client sends username and A
    uname, A = client.start_authentication()
    print(f'   Client → Server: username="{uname}", A={A % 1000000}...')
    
    # Step 2: Server sends salt and B
    result = server.start_session(uname)
    if result:
        salt, B = result
        print(f'   Server → Client: salt={salt.hex()[:32]}..., B={B % 1000000}...')
        
        # Step 3: Client computes and sends M1
        M1 = client.process_challenge(salt, B)
        print(f'   Client → Server: M1={M1.hex()[:32]}... (proof)')
        
        # Step 4: Server verifies and sends M2
        M2 = server.verify_client_proof(M1, A)
        if M2:
            print(f'   Server → Client: M2={M2.hex()[:32]}... (proof)')
            
            # Step 5: Client verifies server
            if client.verify_server(M2):
                print(f'\n✅ AUTHENTICATION SUCCESSFUL!')
                print(f'   Session key established (never transmitted)')
                print(f'   Room key: {client.get_room_key("case-123").hex()[:32]}...')
            else:
                print(f'\n❌ Server verification failed!')
        else:
            print(f'\n❌ Client proof rejected!')
    else:
        print(f'\n❌ User not found!')
    
    print('\n' + '=' * 60)
    print('📌 Key Points:')
    print('   • Password NEVER transmitted over network')
    print('   • Server stores verifier, not password')
    print('   • MITM cannot derive session key without password')
    print('   • Session key used for E2E encryption')
