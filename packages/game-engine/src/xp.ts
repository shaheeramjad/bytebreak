import type { GameScore } from '@bytebreak/shared';

/** Local XP estimate — cloud may rebalance later */
export function computeXpFromScore(score: GameScore, durationSec: number): number {
  const base = Math.round(score.points * 0.5);
  const accuracyBonus = Math.round(score.accuracy * 40);
  const speed = Math.round(score.speedBonus);
  const perfectBonus = score.perfect ? 25 : 0;
  const durationFactor = durationSec <= 90 ? 1 : durationSec <= 180 ? 1.2 : 1.4;
  return Math.max(5, Math.round((base + accuracyBonus + speed + perfectBonus) * durationFactor));
}
