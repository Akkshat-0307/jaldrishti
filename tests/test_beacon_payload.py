"""Unit tests for 16-byte binary beacon payload pack/unpack module."""

from __future__ import annotations

import sys
import os
import pytest

# Ensure apps/api is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from beacon_payload import (
    crc16_ccitt,
    pack_beacon_payload,
    unpack_beacon_payload,
    encode_payload_string,
    decode_payload_string,
)


def test_crc16_standard_vector():
    """Verify standard CRC-16/CCITT vector."""
    assert crc16_ccitt(b"123456789") == 0x29B1


def test_payload_pack_unpack_roundtrip():
    """Verify round-trip encoding and decoding for realistic Assam coordinates."""
    lat = 24.833333
    lon = 92.778899
    ts = 1655550000
    need = "medical"
    group = 4

    payload = pack_beacon_payload(lat=lat, lon=lon, timestamp=ts, need_type=need, group_size=group)
    assert len(payload) == 16

    decoded = unpack_beacon_payload(payload)
    assert abs(decoded["lat"] - lat) < 1e-5
    assert abs(decoded["lon"] - lon) < 1e-5
    assert decoded["timestamp"] == ts
    assert decoded["need_type"] == need
    assert decoded["group_size"] == group
    assert decoded["reserved"] == 0x00


def test_boundary_coordinates():
    """Verify edge and extreme coordinates (-90, +90, -180, +180, zero)."""
    cases = [
        (-90.0, -180.0, 0, "other", 1),
        (90.0, 180.0, 0xFFFFFFFF, "boat", 31),
        (0.0, 0.0, 123456789, "food", 15),
        (-45.123456, 179.999999, 1700000000, "multiple", 8),
    ]
    for lat, lon, ts, need, group in cases:
        payload = pack_beacon_payload(lat, lon, ts, need, group)
        assert len(payload) == 16
        decoded = unpack_beacon_payload(payload)
        assert abs(decoded["lat"] - lat) < 1e-5
        assert abs(decoded["lon"] - lon) < 1e-5
        assert decoded["timestamp"] == ts
        assert decoded["need_type"] == need
        assert decoded["group_size"] == group


def test_out_of_bounds_rejection():
    """Verify out-of-bounds inputs raise ValueError."""
    with pytest.raises(ValueError, match="Latitude out of bounds"):
        pack_beacon_payload(90.0001, 92.0, 100)

    with pytest.raises(ValueError, match="Latitude out of bounds"):
        pack_beacon_payload(-90.0001, 92.0, 100)

    with pytest.raises(ValueError, match="Longitude out of bounds"):
        pack_beacon_payload(24.0, 180.0001, 100)

    with pytest.raises(ValueError, match="Timestamp out of uint32 bounds"):
        pack_beacon_payload(24.0, 92.0, -1)


def test_corrupted_checksum_rejection():
    """Verify modifying any byte causes checksum verification to fail."""
    payload = pack_beacon_payload(24.8, 92.8, 1655550000, "medical", 3)
    assert len(payload) == 16

    # Tamper with byte 0 (latitude)
    tampered_bytes = bytearray(payload)
    tampered_bytes[0] ^= 0x01
    with pytest.raises(ValueError, match="Checksum mismatch"):
        unpack_beacon_payload(bytes(tampered_bytes))

    # Tamper with flags byte
    tampered_flags = bytearray(payload)
    tampered_flags[12] ^= 0x08
    with pytest.raises(ValueError, match="Checksum mismatch"):
        unpack_beacon_payload(bytes(tampered_flags))

    # Tamper with checksum itself
    tampered_crc = bytearray(payload)
    tampered_crc[15] ^= 0x55
    with pytest.raises(ValueError, match="Checksum mismatch"):
        unpack_beacon_payload(bytes(tampered_crc))


def test_wrong_length_rejection():
    """Verify payloads with len != 16 bytes are rejected."""
    with pytest.raises(ValueError, match="Invalid payload length"):
        unpack_beacon_payload(b"short")

    with pytest.raises(ValueError, match="Invalid payload length"):
        unpack_beacon_payload(bytes(17))


def test_string_encoding_roundtrips():
    """Verify hex, base32, and base64url string encoding/decoding."""
    payload = pack_beacon_payload(24.82, 92.79, 1655550000, "food", 5)

    # Hex
    hex_str = encode_payload_string(payload, "hex")
    assert len(hex_str) == 32
    assert decode_payload_string(hex_str) == payload

    # Base32
    b32_str = encode_payload_string(payload, "base32")
    assert len(b32_str) == 26
    assert decode_payload_string(b32_str) == payload

    # Base64URL
    b64_str = encode_payload_string(payload, "base64url")
    assert len(b64_str) == 22
    assert decode_payload_string(b64_str) == payload
