const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const storageRoot = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(__dirname, '..', 'private-storage'));
const typeByExtension = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const gridFsBucketName = 'edupassDocuments';

function getStorageType() {
  const configured = process.env.PRIVATE_UPLOAD_STORAGE;
  const type = configured || (process.env.VERCEL ? 'gridfs' : 'local');
  if (!['local', 'gridfs'].includes(type)) throw new Error('PRIVATE_UPLOAD_STORAGE must be local or gridfs');
  return type;
}

function detectType(header) {
  if (header.length >= 5 && header.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg';
  if (header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

function filenameForDisplay(originalName) {
  const base = path.basename(String(originalName || '').replace(/\\/g, '/'));
  const safe = base.replace(/[<>:"|?*\x00-\x1f\x7f]/g, '_').trim().slice(0, 255);
  return safe || 'Supporting document';
}

async function inspectTemporaryFile(file) {
  if (!file || !file.path || !file.size) throw new ApiError(422, 'Supporting document is empty or missing');
  const extension = path.extname(file.originalname || '').toLowerCase();
  const extensionType = typeByExtension[extension];
  if (!extensionType) throw new ApiError(415, 'Choose a PDF, JPG, JPEG, or PNG document');
  const handle = await fs.open(file.path, 'r');
  const header = Buffer.alloc(16);
  let bytesRead;
  try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); }
  finally { await handle.close(); }
  const verifiedType = detectType(header.subarray(0, bytesRead));
  if (!verifiedType || verifiedType !== extensionType) throw new ApiError(415, 'The document content does not match its file extension or is invalid');
  if (file.mimetype && file.mimetype !== 'application/octet-stream' && file.mimetype !== verifiedType) {
    throw new ApiError(415, 'The document content does not match its declared type');
  }
  return { originalName: filenameForDisplay(file.originalname), mimeType: verifiedType, size: file.size };
}

async function storeTemporaryFile(tempPath, storage = getStorageType(), metadata = {}) {
  if (storage === 'local') {
    const storageKey = crypto.randomUUID();
    const destination = storagePath(storageKey);
    await fs.mkdir(storageRoot, { recursive: true, mode: 0o700 });
    try {
      await fs.copyFile(tempPath, destination, fsSync.constants.COPYFILE_EXCL);
      await fs.chmod(destination, 0o600);
      return storageKey;
    } catch (error) {
      await fs.rm(destination, { force: true }).catch(() => {});
      throw error;
    }
  }

  const bucket = getGridFSBucket();
  const id = new mongoose.Types.ObjectId();
  const upload = bucket.openUploadStreamWithId(id, metadata.originalName || 'supporting-document', {
    contentType: metadata.mimeType,
    metadata: { contentType: metadata.mimeType },
  });
  try {
    await pipeline(fsSync.createReadStream(tempPath), upload);
    return id.toString();
  } catch (error) {
    await bucket.delete(id).catch(() => {});
    throw error;
  }
}

function storagePath(storageKey) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(storageKey || ''))) {
    throw new ApiError(400, 'Invalid document storage key');
  }
  return path.join(storageRoot, storageKey);
}

function getGridFSBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: gridFsBucketName });
}

async function removeTemporaryFile(tempPath) {
  if (tempPath && path.resolve(tempPath).startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

async function deleteStoredFile(storageKey, storage = 'local') {
  if (storage === 'gridfs') {
    if (!mongoose.connection.db) return;
    await getGridFSBucket().delete(new mongoose.Types.ObjectId(storageKey));
    return;
  }
  await fs.rm(storagePath(storageKey), { force: true });
}

function createReadStream(storageKey, storage = 'local') {
  if (storage === 'gridfs') return getGridFSBucket().openDownloadStream(new mongoose.Types.ObjectId(storageKey));
  return fsSync.createReadStream(storagePath(storageKey));
}

module.exports = { inspectTemporaryFile, storeTemporaryFile, removeTemporaryFile, deleteStoredFile, createReadStream, getStorageType };
