/**
 * UUIDv7 — timestamp-ordered identifier.
 * Format: TTTTTTTT-TTTT-7RRR-VRRR-RRRRRRRRRRRR
 *  - 48-bit ms timestamp (big-endian)
 *  - version nibble = 7
 *  - variant bits = 0b10
 *  - remaining bits = random
 */
export function uuidv7(): string {
  const ts = Date.now(); // 48-bit ms timestamp

  // Build 16-byte array
  const bytes = new Uint8Array(16);

  // Bytes 0-5: 48-bit timestamp big-endian
  bytes[0] = (ts / 0x10000000000) & 0xff;
  bytes[1] = (ts / 0x100000000) & 0xff;
  bytes[2] = (ts / 0x1000000) & 0xff;
  bytes[3] = (ts / 0x10000) & 0xff;
  bytes[4] = (ts / 0x100) & 0xff;
  bytes[5] = ts & 0xff;

  // Bytes 6-15: random
  for (let i = 6; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }

  // Set version = 7 (top 4 bits of byte 6)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Set variant = 0b10 (top 2 bits of byte 8)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
