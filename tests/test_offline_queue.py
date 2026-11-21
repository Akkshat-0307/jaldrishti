"""Unit tests for Beacon Offline Queue schema, deduplication, and flush semantics."""

from __future__ import annotations

import os
import sys
import pytest

# Ensure apps/api is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from beacon_payload import (
    pack_beacon_payload,
    encode_payload_string,
    unpack_beacon_payload,
)


class MockOfflineQueue:
    """Python simulation of client IndexedDB offline queue."""

    def __init__(self):
        self._store: dict[str, dict] = {}

    def enqueue(self, item: dict) -> None:
        # Deduplication by payloadCode
        self._store[item["payloadCode"]] = item

    def get_all(self) -> list[dict]:
        return list(self._store.values())

    def remove(self, payload_code: str) -> None:
        self._store.pop(payload_code, None)

    def clear(self) -> None:
        self._store.clear()

    def flush(self, send_fn) -> int:
        flushed = 0
        for code, item in list(self._store.items()):
            if send_fn(item):
                self.remove(code)
                flushed += 1
        return flushed


def test_offline_queue_deduplication():
    """Verify that multiple offline SOS attempts at the same location/time deduplicate."""
    queue = MockOfflineQueue()

    lat = 24.861674
    lon = 92.842047
    ts = 1655550000

    raw1 = pack_beacon_payload(lat, lon, ts, "medical", 3)
    code1 = encode_payload_string(raw1, "base32")

    item1 = {
        "payloadCode": code1,
        "rawHex": raw1.hex().upper(),
        "lat": lat,
        "lon": lon,
        "timestamp": ts,
        "needType": "medical",
        "groupSize": 3,
        "retryCount": 0,
    }

    queue.enqueue(item1)
    assert len(queue.get_all()) == 1

    # Re-enqueuing duplicate code updates rather than duplicating
    item1_retry = dict(item1, retryCount=1)
    queue.enqueue(item1_retry)
    assert len(queue.get_all()) == 1
    assert queue.get_all()[0]["retryCount"] == 1


def test_offline_queue_flush_semantics():
    """Verify queued items are purged on successful transmission and retained on failure."""
    queue = MockOfflineQueue()

    # Enqueue 3 items
    for i in range(3):
        raw = pack_beacon_payload(24.8 + i * 0.01, 92.8 + i * 0.01, 1655550000 + i, "food", 2)
        code = encode_payload_string(raw, "base32")
        queue.enqueue({
            "payloadCode": code,
            "rawHex": raw.hex().upper(),
            "lat": 24.8 + i * 0.01,
            "lon": 92.8 + i * 0.01,
            "timestamp": 1655550000 + i,
            "needType": "food",
            "groupSize": 2,
            "id": f"item_{i}",
        })

    assert len(queue.get_all()) == 3

    # Send function that only succeeds on item_0 and item_2
    def mock_send(item):
        return item["id"] in ["item_0", "item_2"]

    sent = queue.flush(mock_send)
    assert sent == 2
    assert len(queue.get_all()) == 1
    assert queue.get_all()[0]["id"] == "item_1"


def test_offline_beacon_packet_integrity():
    """Verify that queued payload string can be accurately decoded by the server."""
    lat = 24.833333
    lon = 92.778899
    ts = 1655550000
    need = "boat"
    group = 7

    raw = pack_beacon_payload(lat, lon, ts, need, group)
    code = encode_payload_string(raw, "base32")

    # Client queues 'code'
    # Server decodes 'code'
    from beacon_payload import decode_payload_string
    server_raw = decode_payload_string(code)
    unpacked = unpack_beacon_payload(server_raw)

    assert abs(unpacked["lat"] - lat) < 1e-5
    assert abs(unpacked["lon"] - lon) < 1e-5
    assert unpacked["need_type"] == need
    assert unpacked["group_size"] == group
