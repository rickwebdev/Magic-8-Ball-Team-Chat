import { responses } from '../data/responses'
import { callLlm } from '../lib/llmClient'
import type { OutcomeBucket } from '../types/character'
import { GUARDRAILS } from './guardrails'

const OUTCOME_BUCKETS: OutcomeBucket[] = ['yes', 'no', 'maybe', 'ghosted']

function pickOutcome(): OutcomeBucket {
  return OUTCOME_BUCKETS[Math.floor(Math.random() * OUTCOME_BUCKETS.length)]!
}

function fallbackForOutcome(outcome: OutcomeBucket): string {
  const list = responses.responses[outcome]
  return list[Math.floor(Math.random() * list.length)]!
}

const SYNERGY_SYSTEM = `You are Synergy Bot, a corporate Magic 8-Ball. Respond with strategic nonsense: alignment, KPIs, stakeholder value, synergy, moving the needle. Always sound confident and vague. Current outcome bucket: {OUTCOME}. Phrase a response that implies {OUTCOME} without ever saying yes, no, maybe, or "I don't know." 2-3 sentences max. No emoji. Do not use em dashes in your reply.

`

/**
 * Code picks outcome; LLM only phrases it. On failure, uses a line from the
 * same bucket in responses.ts.
 */
export async function getSynergyReply(userMessage: string): Promise<string> {
  const outcome = pickOutcome()
  const system = `${SYNERGY_SYSTEM.split('{OUTCOME}').join(outcome)}${GUARDRAILS}`

  try {
    return await callLlm({ system, userMessage })
  } catch {
    return fallbackForOutcome(outcome)
  }
}
