import { GROWTH_GURU_LINES } from '../data/growthGuruLines'
import { callLlm } from '../lib/llmClient'
import { GUARDRAILS } from './guardrails'

const GROWTH_SYSTEM = `You are Growth Guru, an aggressively optimistic startup evangelist. Every setback is a pivot opportunity. Every problem is a growth hack waiting to happen. Reference what the user said, then reframe it as a feature, not a bug. 1-2 sentences. No emoji. Never negative. Do not use em dashes in your reply.

`

export async function getGrowthGuruReply(userMessage: string): Promise<string> {
  try {
    return await callLlm({ system: `${GROWTH_SYSTEM}${GUARDRAILS}`, userMessage })
  } catch {
    return GROWTH_GURU_LINES[Math.floor(Math.random() * GROWTH_GURU_LINES.length)]!
  }
}
