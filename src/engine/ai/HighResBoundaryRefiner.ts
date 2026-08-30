import { GuidedFilter } from './GuidedFilter';

export class HighResBoundaryRefiner {
  /**
   * Identifies boundary tiles with high uncertainty and runs localized high-resolution matting
   */
  public static refineBoundaries(
    guideR: Float32Array,
    guideG: Float32Array,
    guideB: Float32Array,
    mask: Float32Array,
    width: number,
    height: number,
    tileSize: number = 64
  ): Float32Array {
    const size = width * height;
    const output = new Float32Array(mask);

    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const startX = tx * tileSize;
        const startY = ty * tileSize;
        const actualTileW = Math.min(tileSize, width - startX);
        const actualTileH = Math.min(tileSize, height - startY);
        const tileArea = actualTileW * actualTileH;

        // Check if this tile contains a boundary (has both high and low alpha or high uncertainty)
        let minAlpha = 1.0;
        let maxAlpha = 0.0;

        for (let y = 0; y < actualTileH; y++) {
          for (let x = 0; x < actualTileW; x++) {
            const idx = (startY + y) * width + (startX + x);
            const a = mask[idx];
            if (a < minAlpha) minAlpha = a;
            if (a > maxAlpha) maxAlpha = a;
          }
        }

        // If tile contains a transition boundary (0.05 to 0.95), refine this local patch
        if (minAlpha < 0.85 && maxAlpha > 0.15) {
          const tileR = new Float32Array(tileArea);
          const tileG = new Float32Array(tileArea);
          const tileB = new Float32Array(tileArea);
          const tileMask = new Float32Array(tileArea);

          for (let y = 0; y < actualTileH; y++) {
            for (let x = 0; x < actualTileW; x++) {
              const fullIdx = (startY + y) * width + (startX + x);
              const tIdx = y * actualTileW + x;
              tileR[tIdx] = guideR[fullIdx];
              tileG[tIdx] = guideG[fullIdx];
              tileB[tIdx] = guideB[fullIdx];
              tileMask[tIdx] = mask[fullIdx];
            }
          }

          // Run localized sub-pixel guided matting on the tile
          const refinedTile = GuidedFilter.filter(tileR, tileG, tileB, tileMask, actualTileW, actualTileH, 4, 0.0003);

          // Write back with smooth tile boundary blending
          for (let y = 0; y < actualTileH; y++) {
            for (let x = 0; x < actualTileW; x++) {
              const fullIdx = (startY + y) * width + (startX + x);
              const tIdx = y * actualTileW + x;
              output[fullIdx] = 0.85 * refinedTile[tIdx] + 0.15 * mask[fullIdx];
            }
          }
        }
      }
    }

    return output;
  }
}
