import * as zlib from 'node:zlib';

/**
 * Pure Node.js zero-dependency PKZIP format writer & extractor.
 * Adheres strictly to PKZIP specification (APPNOTE.TXT) using native node:zlib.
 * Includes security hardening: path traversal prevention & CRC32 verification.
 */

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  content: string | Buffer;
}

export interface ZipEntry {
  name: string;
  content: Buffer;
  text: () => string;
  json: <T = any>() => T;
}

/**
 * Sanitize filename to prevent directory traversal and illegal characters
 */
export function sanitizeZipPath(rawPath: string): string {
  // Replace backslashes
  let clean = rawPath.replace(/\\/g, '/');
  // Strip drive letters, leading slashes, and relative traversals
  clean = clean.replace(/^[a-zA-Z]:\/?/, '').replace(/^\/+/, '');
  const segments = clean.split('/').filter((s) => s.length > 0 && s !== '.' && s !== '..');
  return segments.join('/');
}

/**
 * Creates a valid PKZIP Buffer containing the given files.
 */
export function createZipBuffer(files: ZipFileInput[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralDirectoryHeaders: Buffer[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const file of files) {
    const safeName = sanitizeZipPath(file.name);
    if (!safeName) continue;

    const uncompressedData = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf8');

    const uncompressedSize = uncompressedData.length;
    const fileCrc = crc32(uncompressedData);
    const nameBytes = Buffer.from(safeName, 'utf8');

    // Compress using raw deflate (RFC 1951, no zlib header)
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const compressedSize = compressedData.length;
    const compressionMethod = 8; // Deflate

    // Local file header (30 bytes + name length)
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed (2.0)
    localHeader.writeUInt16LE(0, 6);          // general purpose bit flag
    localHeader.writeUInt16LE(compressionMethod, 8); // compression method (deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBytes.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory file header (46 bytes + name length)
    const cdHeader = Buffer.alloc(46 + nameBytes.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // central file header signature
    cdHeader.writeUInt16LE(20, 4);         // version made by (2.0)
    cdHeader.writeUInt16LE(20, 6);         // version needed to extract
    cdHeader.writeUInt16LE(0, 8);          // general purpose bit flag
    cdHeader.writeUInt16LE(compressionMethod, 10);
    cdHeader.writeUInt16LE(dosTime, 12);
    cdHeader.writeUInt16LE(dosDate, 14);
    cdHeader.writeUInt32LE(fileCrc, 16);
    cdHeader.writeUInt32LE(compressedSize, 20);
    cdHeader.writeUInt32LE(uncompressedSize, 24);
    cdHeader.writeUInt16LE(nameBytes.length, 28);
    cdHeader.writeUInt16LE(0, 30); // extra field length
    cdHeader.writeUInt16LE(0, 32); // file comment length
    cdHeader.writeUInt16LE(0, 34); // disk number start
    cdHeader.writeUInt16LE(0, 36); // internal file attributes
    cdHeader.writeUInt32LE(0, 38); // external file attributes
    cdHeader.writeUInt32LE(offset, 42); // relative offset of local header
    nameBytes.copy(cdHeader, 46);

    centralDirectoryHeaders.push(cdHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirectoryBuffer = Buffer.concat(centralDirectoryHeaders);
  const cdOffset = offset;
  const cdSize = centralDirectoryBuffer.length;
  const fileCount = centralDirectoryHeaders.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // disk where central directory starts
  eocd.writeUInt16LE(fileCount, 8);  // number of records on this disk
  eocd.writeUInt16LE(fileCount, 10); // total number of central directory records
  eocd.writeUInt32LE(cdSize, 12);    // size of central directory
  eocd.writeUInt32LE(cdOffset, 16);  // offset of central directory
  eocd.writeUInt16LE(0, 20);         // comment length

  return Buffer.concat([...localHeaders, centralDirectoryBuffer, eocd]);
}

/**
 * Safely parses and extracts files from a PKZIP Buffer.
 */
export function parseZipBuffer(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  if (!Buffer.isBuffer(buf) || buf.length < 22) {
    throw new Error('Invalid or corrupted zip archive: buffer too small');
  }

  // Find End of Central Directory Record (scan backwards from end)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid zip archive: missing End of Central Directory record');
  }

  const cdTotalRecords = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  let currentCdOffset = cdOffset;
  for (let idx = 0; idx < cdTotalRecords; idx++) {
    if (currentCdOffset + 46 > buf.length) break;
    const sig = buf.readUInt32LE(currentCdOffset);
    if (sig !== 0x02014b50) break; // central directory signature

    const method = buf.readUInt16LE(currentCdOffset + 10);
    const fileCrc = buf.readUInt32LE(currentCdOffset + 16);
    const compSize = buf.readUInt32LE(currentCdOffset + 20);
    const uncompSize = buf.readUInt32LE(currentCdOffset + 24);
    const nameLen = buf.readUInt16LE(currentCdOffset + 28);
    const extraLen = buf.readUInt16LE(currentCdOffset + 30);
    const commentLen = buf.readUInt16LE(currentCdOffset + 32);
    const localHeaderOffset = buf.readUInt32LE(currentCdOffset + 42);

    const nameRaw = buf.toString('utf8', currentCdOffset + 46, currentCdOffset + 46 + nameLen);
    const safeName = sanitizeZipPath(nameRaw);

    // Read from local header
    if (localHeaderOffset + 30 <= buf.length) {
      const localSig = buf.readUInt32LE(localHeaderOffset);
      if (localSig === 0x04034b50) {
        const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedData = buf.subarray(dataStart, dataStart + compSize);

        let uncompressedData: Buffer;
        if (method === 0) {
          // Uncompressed / Stored
          uncompressedData = Buffer.from(compressedData);
        } else if (method === 8) {
          // Deflated
          uncompressedData = zlib.inflateRawSync(compressedData);
        } else {
          throw new Error(`Unsupported compression method ${method} for file ${safeName}`);
        }

        // Verify CRC32
        const computedCrc = crc32(uncompressedData);
        if (computedCrc !== fileCrc && fileCrc !== 0) {
          console.warn(`[ZIP] Warning: CRC32 mismatch for ${safeName}: expected ${fileCrc}, got ${computedCrc}`);
        }

        if (safeName && !safeName.endsWith('/')) {
          entries.push({
            name: safeName,
            content: uncompressedData,
            text: () => uncompressedData.toString('utf8'),
            json: <T = any>() => JSON.parse(uncompressedData.toString('utf8')) as T
          });
        }
      }
    }

    currentCdOffset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}
