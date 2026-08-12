import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluatePrintQuality, PRINT_QUALITY_STANDARD, PRINT_SIZES, readJpegDimensions } from './print-quality.mjs';

const root = process.cwd();
const assetDirectory = path.join(root, 'print-assets');
const outputPath = path.join(root, 'print-eligibility.json');

const assetNames = (await readdir(assetDirectory))
  .filter(name => /^NM-\d{3,9}\.jpg$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const photos = {};
for (const assetName of assetNames) {
  const id = assetName.replace(/\.jpg$/i, '').toUpperCase();
  const bytes = await readFile(path.join(assetDirectory, assetName));
  const dimensions = readJpegDimensions(bytes);
  photos[id] = evaluatePrintQuality(dimensions.width, dimensions.height);
}

const manifest = {
  version: 1,
  standard: {
    ...PRINT_QUALITY_STANDARD,
    sizes: PRINT_SIZES.map(({ key, longEdgeInches, shortEdgeInches }) => ({
      key,
      dimensionsInches: `${shortEdgeInches}x${longEdgeInches}`
    }))
  },
  photos
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

const counts = Object.values(photos).reduce((result, photo) => {
  for (const size of PRINT_SIZES) {
    if (photo.eligibleSizes.includes(size.key)) result[size.key] += 1;
  }
  return result;
}, Object.fromEntries(PRINT_SIZES.map(size => [size.key, 0])));

console.log(`Audited ${assetNames.length} print asset(s).`);
for (const size of PRINT_SIZES) console.log(`${size.key}: ${counts[size.key]} eligible.`);
