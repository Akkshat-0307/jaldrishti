/**
 * 16-Byte Compact Binary Beacon Payload (TypeScript).
 *
 * Binary Layout:
 *   Bytes 0-3:   int32 latitude in micro-degrees (big-endian) [-90,000,000 to +90,000,000]
 *   Bytes 4-7:   int32 longitude in micro-degrees (big-endian) [-180,000,000 to +180,000,000]
 *   Bytes 8-11:  uint32 Unix timestamp in seconds (big-endian)
 *   Byte 12:     uint8 flags:
 *                  Bits 0-2: need_type (0=other, 1=medical, 2=food, 3=boat, 4=multiple)
 *                  Bits 3-7: group_size (1-31)
 *   Byte 13:     uint8 reserved (0x00)
 *   Bytes 14-15: uint16 CRC-16/CCITT checksum over bytes 0-13 (big-endian)
 */

export type NeedType = "other" | "medical" | "food" | "boat" | "multiple";

export interface DecodedBeacon {
  lat: number;
  lon: number;
  timestamp: number;
  needType: NeedType;
  groupSize: number;
  reserved: number;
  crc16: number;
}

const NEED_MAP: Record<number, NeedType> = {
  0: "other",
  1: "medical",
  2: "food",
  3: "boat",
  4: "multiple",
};

const NEED_REV_MAP: Record<string, number> = {
  other: 0,
  medical: 1,
  food: 2,
  boat: 3,
  multiple: 4,
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Standard CRC-16/CCITT calculation (poly 0x1021, init 0xFFFF, xorout 0x0000).
 */
export function crc16Ccitt(data: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/**
 * Pack beacon coordinates and metadata into a 16-byte binary payload.
 */
export function packBeaconPayload(
  lat: number,
  lon: number,
  timestamp: number,
  needType: NeedType = "other",
  groupSize: number = 1
): Uint8Array {
  if (lat < -90 || lat > 90) throw new Error(`Latitude out of bounds: ${lat}`);
  if (lon < -180 || lon > 180) throw new Error(`Longitude out of bounds: ${lon}`);
  if (timestamp < 0 || timestamp > 0xffffffff) throw new Error(`Timestamp out of bounds: ${timestamp}`);

  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);

  const latMicro = Math.round(lat * 1_000_000);
  const lonMicro = Math.round(lon * 1_000_000);
  const needCode = NEED_REV_MAP[needType] ?? 0;
  const clampedGroup = Math.min(Math.max(Math.floor(groupSize), 1), 31);
  const flags = (needCode & 0x07) | ((clampedGroup & 0x1f) << 3);

  // Bytes 0-3: lat int32
  view.setInt32(0, latMicro, false);
  // Bytes 4-7: lon int32
  view.setInt32(4, lonMicro, false);
  // Bytes 8-11: timestamp uint32
  view.setUint32(8, timestamp, false);
  // Byte 12: flags uint8
  view.setUint8(12, flags);
  // Byte 13: reserved uint8
  view.setUint8(13, 0x00);

  // Bytes 14-15: CRC-16
  const headerBytes = new Uint8Array(buffer, 0, 14);
  const crc = crc16Ccitt(headerBytes);
  view.setUint16(14, crc, false);

  return new Uint8Array(buffer);
}

/**
 * Unpack a 16-byte binary payload into decoded beacon attributes.
 */
export function unpackBeaconPayload(raw: Uint8Array): DecodedBeacon {
  if (raw.length !== 16) {
    throw new Error(`Invalid payload length: expected 16 bytes, got ${raw.length}`);
  }

  const header = raw.subarray(0, 14);
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  const expectedCrc = view.getUint16(14, false);
  const actualCrc = crc16Ccitt(header);

  if (actualCrc !== expectedCrc) {
    throw new Error(
      `Checksum mismatch: expected 0x${expectedCrc.toString(16).toUpperCase().padStart(4, "0")}, got 0x${actualCrc.toString(16).toUpperCase().padStart(4, "0")}`
    );
  }

  const latMicro = view.getInt32(0, false);
  const lonMicro = view.getInt32(4, false);
  const timestamp = view.getUint32(8, false);
  const flags = view.getUint8(12);
  const reserved = view.getUint8(13);

  const needCode = flags & 0x07;
  const groupSize = (flags >> 3) & 0x1f;

  return {
    lat: Math.round((latMicro / 1_000_000) * 1e6) / 1e6,
    lon: Math.round((lonMicro / 1_000_000) * 1e6) / 1e6,
    timestamp,
    needType: NEED_MAP[needCode] ?? "other",
    groupSize: Math.max(groupSize, 1),
    reserved,
    crc16: expectedCrc,
  };
}

/**
 * Base32 encode 16-byte payload.
 */
export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decode string into Uint8Array.
 */
export function decodeBase32(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error(`Invalid Base32 character: ${clean[i]}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

/**
 * Convert bytes to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

/**
 * Convert hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}
