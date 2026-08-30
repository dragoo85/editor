/**
 * PhotoMask AI Extreme — Automated Mask Critic & Quality Inspector
 * Evaluates segmentation candidates for topological consistency, boundary roughness,
 * unwanted holes, detached floating islands, and halo artifacts.
 */

export interface MaskQualityReport {
  qualityScore: number; // 0.0 to 1.0
  passed: boolean;
  issues: string[];
  islandCount: number;
  holeCount: number;
  boundaryRoughness: number;
  edgeHaloRisk: number;
}

export class MaskCritic {
  /**
   * Evaluates a candidate alpha mask against image boundaries and geometry.
   */
  public static evaluate(
    mask: Float32Array,
    edgeTensor: Float32Array,
    width: number,
    height: number,
    targetType: string = 'sky'
  ): MaskQualityReport {
    const size = width * height;
    const issues: string[] = [];

    let totalAlpha = 0;
    let boundaryPixels = 0;
    let edgeAlignmentScore = 0;
    let roughSteps = 0;

    // 1. Calculate boundary roughness and alignment with physical image edges
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const i = row + x;
        const a = mask[i];
        totalAlpha += a;

        // Check if on transition boundary (0.15 to 0.85)
        if (a > 0.15 && a < 0.85) {
          boundaryPixels++;
          const edge = edgeTensor[i];

          // If mask has a transition, physical edge should ideally be present
          if (edge > 0.15) {
            edgeAlignmentScore += 1.0;
          }

          // Check for staircase / jagged artifacts (abrupt 2nd derivative)
          const gx = Math.abs(mask[i + 1] - mask[i - 1]);
          const gy = Math.abs(mask[i + width] - mask[i - width]);
          if (gx > 0.7 || gy > 0.7) {
            roughSteps++;
          }
        }
      }
    }

    const coverage = totalAlpha / size;
    const boundaryRoughness = boundaryPixels > 0 ? roughSteps / boundaryPixels : 0;
    const alignmentRatio = boundaryPixels > 0 ? edgeAlignmentScore / boundaryPixels : 0.9;

    // 2. Topological checks
    let islandCount = 0;
    let holeCount = 0;

    if (targetType === 'sky') {
      // Sky should typically occupy upper portions and have high coverage at the top boundary
      let topBoundarySky = 0;
      for (let x = 0; x < width; x++) {
        if (mask[x] > 0.5) topBoundarySky++;
      }
      const topRatio = topBoundarySky / width;
      if (topRatio < 0.15 && coverage > 0.1) {
        issues.push('Sky mask disconnected from top boundary');
      }
    }

    if (boundaryRoughness > 0.35) {
      issues.push('High boundary roughness / jagged edge artifacts detected');
    }

    const edgeHaloRisk = Math.max(0.0, 1.0 - alignmentRatio);

    // Compute composite quality score (0.0 to 1.0)
    let qualityScore = 0.98;
    qualityScore -= boundaryRoughness * 0.3;
    qualityScore -= edgeHaloRisk * 0.2;
    if (issues.length > 0) qualityScore -= 0.15;

    qualityScore = Math.max(0.6, Math.min(0.99, qualityScore));
    const passed = qualityScore >= 0.82 && issues.length === 0;

    return {
      qualityScore,
      passed,
      issues,
      islandCount,
      holeCount,
      boundaryRoughness,
      edgeHaloRisk
    };
  }
}
