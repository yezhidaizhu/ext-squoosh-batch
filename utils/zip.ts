export type ZipEntry = {
  name: string;
  blob: Blob;
  lastModified?: number;
};

const encoder = new TextEncoder();
let crcTable: Uint32Array | undefined;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crcTable[i] = value >>> 0;
  }
  return crcTable;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function uint8(view: DataView) {
  return new Uint8Array(view.buffer);
}

function asArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeEntryName(name: string) {
  return name
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\0/g, '')
    || 'image';
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('ZIP creation cancelled.', 'AbortError');
}

export async function createZipBlob(entries: ZipEntry[], signal?: AbortSignal) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    assertNotAborted(signal);

    const nameBytes = encoder.encode(normalizeEntryName(entry.name));
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(data);
    const { time, date } = dosDateTime(entry.lastModified);

    const localHeader = new DataView(new ArrayBuffer(30));
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, time);
    writeUint16(localHeader, 12, date);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, data.byteLength);
    writeUint32(localHeader, 22, data.byteLength);
    writeUint16(localHeader, 26, nameBytes.byteLength);
    writeUint16(localHeader, 28, 0);

    localParts.push(uint8(localHeader), nameBytes, data);

    const centralHeader = new DataView(new ArrayBuffer(46));
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, time);
    writeUint16(centralHeader, 14, date);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, data.byteLength);
    writeUint32(centralHeader, 24, data.byteLength);
    writeUint16(centralHeader, 28, nameBytes.byteLength);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);

    centralParts.push(uint8(centralHeader), nameBytes);
    offset += localHeader.byteLength + nameBytes.byteLength + data.byteLength;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);
  writeUint16(end, 20, 0);

  return new Blob([...localParts, ...centralParts, uint8(end)].map(asArrayBuffer), { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
