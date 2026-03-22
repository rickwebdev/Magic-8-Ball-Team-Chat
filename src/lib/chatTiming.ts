/** Minimum time the typing indicator should show before the reply appears (ms). */
export const MIN_TYPING_MS = 800

export async function ensureMinMsSince(since: number, minMs: number): Promise<void> {
  const elapsed = Date.now() - since
  const pad = Math.max(0, minMs - elapsed)
  if (pad > 0) await new Promise<void>((r) => setTimeout(r, pad))
}
