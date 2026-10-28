const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const storage = require('../utils/document-storage.service');

async function withTempFile(name, bytes, run, mimetype = 'application/pdf') {
  const temp = path.join(os.tmpdir(), `edupass-${crypto.randomUUID()}.upload`);
  await fs.writeFile(temp, bytes);
  try { await run({ path: temp, originalname: name, mimetype, size: bytes.length }); }
  finally { await storage.removeTemporaryFile(temp); }
}

test('valid PDF signature is accepted and stored outside MongoDB', async () => {
  let key;
  await withTempFile('proof.pdf', Buffer.from('%PDF-1.7\nprivate test'), async (file) => {
    const metadata = await storage.inspectTemporaryFile(file);
    assert.equal(metadata.mimeType, 'application/pdf');
    assert.equal(metadata.originalName, 'proof.pdf');
    key = await storage.storeTemporaryFile(file.path);
    assert.match(key, /^[0-9a-f-]{36}$/i);
    const stored = path.join(__dirname, '..', 'private-storage', key);
    assert.deepEqual(await fs.readFile(stored), await fs.readFile(file.path));
  });
  await storage.deleteStoredFile(key);
});


test('JPEG and PNG signatures are detected from content', async () => {
  await withTempFile('photo.jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00]), async (file) => {
    assert.equal((await storage.inspectTemporaryFile(file)).mimeType, 'image/jpeg');
  }, 'image/jpeg');
  await withTempFile('scan.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]), async (file) => {
    assert.equal((await storage.inspectTemporaryFile(file)).mimeType, 'image/png');
  }, 'image/png');
});
test('misleading extensions and invalid signatures are rejected', async () => {
  await withTempFile('not-a-pdf.pdf', Buffer.from('<html>not a pdf</html>'), async (file) => {
    await assert.rejects(storage.inspectTemporaryFile(file), { statusCode: 415 });
  });
  await withTempFile('actually-a-pdf.jpg', Buffer.from('%PDF-1.7\ndata'), async (file) => {
    await assert.rejects(storage.inspectTemporaryFile(file), { statusCode: 415 });
  });
});

test('storage keys cannot escape the private directory', () => {
  assert.throws(() => storage.createReadStream('../outside'), { statusCode: 400 });
});

