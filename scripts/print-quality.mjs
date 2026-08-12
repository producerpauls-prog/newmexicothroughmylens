export const PRINT_QUALITY_STANDARD = Object.freeze({
  minimumEffectiveDpi: 150,
  maximumCropLossPercent: 25
});

export const PRINT_SIZES = Object.freeze([
  Object.freeze({ key: '8X10', longEdgeInches: 10, shortEdgeInches: 8 }),
  Object.freeze({ key: '16X20', longEdgeInches: 20, shortEdgeInches: 16 }),
  Object.freeze({ key: '20X30', longEdgeInches: 30, shortEdgeInches: 20 })
]);

const START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

export function readJpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('File is not a valid JPEG.');
  }

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    if (START_OF_FRAME_MARKERS.has(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  throw new Error('JPEG dimensions could not be read.');
}

export function evaluatePrintQuality(width, height) {
  const longPixels = Math.max(width, height);
  const shortPixels = Math.min(width, height);
  const sourceRatio = longPixels / shortPixels;
  const evaluations = {};

  for (const size of PRINT_SIZES) {
    const targetRatio = size.longEdgeInches / size.shortEdgeInches;
    const effectiveDpi = Math.min(
      longPixels / size.longEdgeInches,
      shortPixels / size.shortEdgeInches
    );
    const retainedFraction = Math.min(sourceRatio / targetRatio, targetRatio / sourceRatio);
    const cropLossPercent = (1 - retainedFraction) * 100;
    const eligible =
      effectiveDpi >= PRINT_QUALITY_STANDARD.minimumEffectiveDpi &&
      cropLossPercent <= PRINT_QUALITY_STANDARD.maximumCropLossPercent;

    evaluations[size.key] = {
      effectiveDpi: round(effectiveDpi),
      cropLossPercent: round(cropLossPercent),
      eligible
    };
  }

  return {
    width,
    height,
    eligibleSizes: PRINT_SIZES
      .map(size => size.key)
      .filter(size => evaluations[size].eligible),
    evaluations
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}
