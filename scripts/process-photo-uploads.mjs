import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const incomingDirectory = path.join(root, 'incoming-photos');
const assetDirectory = path.join(root, 'print-assets');
const manifestPath = path.join(root, 'photos.json');
const assetBaseUrl = 'https://raw.githubusercontent.com/producerpauls-prog/newmexicothroughmylens/main/print-assets';

await mkdir(incomingDirectory, { recursive: true });
await mkdir(assetDirectory, { recursive: true });

const incomingFiles = (await readdir(incomingDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && /^.+\.jpe?g$/i.test(entry.name))
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b));

if (!incomingFiles.length) {
  console.log('No JPEG uploads to process.');
  process.exit(0);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.photos)) throw new Error('photos.json must contain a photos array.');

const assetFiles = await readdir(assetDirectory);
const usedNumbers = assetFiles
  .map(name => name.match(/^NM-(\d{3,9})\.jpg$/i)?.[1])
  .filter(Boolean)
  .map(Number);
let nextNumber = Math.max(0, ...usedNumbers) + 1;

const knownHashes = new Set(manifest.photos.map(photo => photo.sha256).filter(Boolean));
let published = 0;

for (const filename of incomingFiles) {
  const incomingPath = path.join(incomingDirectory, filename);
  const bytes = await readFile(incomingPath);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new Error(`${filename} is not a valid JPEG file.`);
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (knownHashes.has(sha256)) {
    console.log(`Skipping duplicate upload ${filename}.`);
    await rm(incomingPath);
    continue;
  }

  const id = `NM-${String(nextNumber).padStart(3, '0')}`;
  nextNumber += 1;
  const assetName = `${id}.jpg`;
  await copyFile(incomingPath, path.join(assetDirectory, assetName));
  await rm(incomingPath);

  manifest.photos.push({
    id,
    assetUrl: `${assetBaseUrl}/${assetName}`,
    sha256,
    uploadedAt: new Date().toISOString(),
    published: true
  });
  knownHashes.add(sha256);
  published += 1;
  console.log(`Published ${filename} as ${id}.`);
}

manifest.photos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Processed ${published} new photograph(s).`);
