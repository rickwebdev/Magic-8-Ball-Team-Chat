/**
 * Total user message count across the listed chats (each history entry = one user send).
 */
export function computeTotalUserMessages(
  synergyLen: number,
  memeLen: number,
  scapegoatLen: number,
  ninjaLen: number,
  groupLen: number,
  growthLen: number,
): number {
  return synergyLen + memeLen + scapegoatLen + ninjaLen + groupLen + growthLen
}
