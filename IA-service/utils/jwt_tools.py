"""JWT parsing utilities - extract claims without verification."""
import json
import base64
from typing import Optional


def decode_jwt_without_verify(token: str) -> Optional[dict]:
    """
    Decode a JWT without verifying signature.
    Used to extract claims like 'sub' (Auth0 user ID).
    
    JWT format: header.payload.signature
    """
    if not token or not isinstance(token, str):
        return None
    
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith("Bearer "):
            token = token[7:]
        
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        # Decode payload (second part)
        payload = parts[1]
        # Add padding if needed
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        
        decoded = base64.urlsafe_b64decode(payload)
        claims = json.loads(decoded)
        return claims
        
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None


def get_auth0_user_id(token: str) -> Optional[str]:
    """
    Extract the Auth0 user ID (sub claim) from JWT.
    Returns the 'sub' claim which is the Auth0 user identifier (e.g., 'google-oauth2|123456789').
    """
    if not token:
        return None
    
    claims = decode_jwt_without_verify(token)
    if not claims:
        return None
    
    return claims.get("sub")
