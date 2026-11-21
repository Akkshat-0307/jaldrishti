"""16-byte compact binary beacon payload pack/unpack module.

Spec:
  Bytes 0-3:   int32 latitude in micro-degrees (big-endian) [-90,000,000 to +90,000,000]
  Bytes 4-7:   int32 longitude in micro-degrees (big-endian) [-180,000,000 to +180,000,000]
  Bytes 8-11:  uint32 Unix timestamp in seconds (big-endian)
  Byte 12:     uint8 flags:
                 Bits 0-2: need_type (0=other, 1=medical, 2=food, 3=boat, 4=multiple)
                 Bits 3-7: group_size (1-31)
  Byte 13:     uint8 reserved (0x00)
  Bytes 14-15: uint16 CRC-16/CCITT checksum over bytes 0-13 (big-endian)
"""

from __future__ import annotations

import base64
import struct
from typing import Any, Literal

NEED_MAP = {
    0: "other",
    1: "medical",
    2: "food",
    3: "boat",
    4: "multiple",
}

NEED_REV_MAP = {v: k for k, v in NEED_MAP.items()}


def crc16_ccitt(data: bytes) -> int:
    """Compute CRC-16/CCITT (poly 0x1021, init 0xFFFF, xorout 0x0000)."""
    crc = 0xFFFF
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def pack_beacon_payload(
    lat: float,
    lon: float,
    timestamp: int,
    need_type: str = "other",
    group_size: int = 1,
) -> bytes:
    """Pack beacon attributes into a 16-byte binary payload."""
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude out of bounds [-90, 90]: {lat}")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude out of bounds [-180, 180]: {lon}")
    if timestamp < 0 or timestamp > 0xFFFFFFFF:
        raise ValueError(f"Timestamp out of uint32 bounds: {timestamp}")

    lat_micro = int(round(lat * 1_000_000))
    lon_micro = int(round(lon * 1_000_000))

    need_code = NEED_REV_MAP.get(need_type.lower(), 0)
    clamped_group = min(max(int(group_size), 1), 31)
    flags = (need_code & 0x07) | ((clamped_group & 0x1F) << 3)
    reserved = 0x00

    header = struct.pack(">iiIBB", lat_micro, lon_micro, timestamp, flags, reserved)
    checksum = crc16_ccitt(header)
    payload = header + struct.pack(">H", checksum)

    if len(payload) != 16:
        raise RuntimeError(f"Payload packing error: expected 16 bytes, got {len(payload)}")

    return payload


def unpack_beacon_payload(raw: bytes) -> dict[str, Any]:
    """Unpack a 16-byte binary payload into a dictionary after verifying checksum."""
    if len(raw) != 16:
        raise ValueError(f"Invalid payload length: expected 16 bytes, got {len(raw)}")

    header = raw[:14]
    expected_crc = struct.unpack(">H", raw[14:16])[0]
    actual_crc = crc16_ccitt(header)

    if actual_crc != expected_crc:
        raise ValueError(
            f"Checksum mismatch: expected 0x{expected_crc:04X}, computed 0x{actual_crc:04X}"
        )

    lat_micro, lon_micro, timestamp, flags, reserved = struct.unpack(">iiIBB", header)

    need_code = flags & 0x07
    group_size = (flags >> 3) & 0x1F

    return {
        "lat": round(lat_micro / 1_000_000.0, 6),
        "lon": round(lon_micro / 1_000_000.0, 6),
        "timestamp": timestamp,
        "need_type": NEED_MAP.get(need_code, "other"),
        "group_size": max(group_size, 1),
        "reserved": reserved,
        "crc16": expected_crc,
    }


def encode_payload_string(payload: bytes, encoding: Literal["base32", "base64url", "hex"] = "base32") -> str:
    """Encode 16-byte payload into a string representation for SMS / web transport."""
    if len(payload) != 16:
        raise ValueError("Payload must be exactly 16 bytes")

    if encoding == "hex":
        return payload.hex().upper()
    elif encoding == "base32":
        return base64.b32encode(payload).decode("ascii").rstrip("=")
    elif encoding == "base64url":
        return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    else:
        raise ValueError(f"Unknown encoding: {encoding}")


def decode_payload_string(encoded: str) -> bytes:
    """Decode a payload string (auto-detecting hex, base32, or base64url)."""
    cleaned = encoded.strip()
    if not cleaned:
        raise ValueError("Empty payload string")

    # Try hex (32 characters, 0-9a-fA-F)
    if len(cleaned) == 32:
        try:
            return bytes.fromhex(cleaned)
        except ValueError:
            pass

    # Try base32 (length 26, alphanumeric uppercase)
    # Add padding if necessary
    try:
        pad_len = (8 - (len(cleaned) % 8)) % 8
        b32_str = cleaned.upper() + ("=" * pad_len)
        decoded = base64.b32decode(b32_str)
        if len(decoded) == 16:
            return decoded
    except Exception:
        pass

    # Try base64url (length 22)
    try:
        pad_len = (4 - (len(cleaned) % 4)) % 4
        b64_str = cleaned + ("=" * pad_len)
        decoded = base64.urlsafe_b64decode(b64_str)
        if len(decoded) == 16:
            return decoded
    except Exception:
        pass

    raise ValueError(f"Could not decode payload string: '{encoded}'")
