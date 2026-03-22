import { SCAPEGOAT_EXCUSES } from '../data/scapegoatExcuses'
import { callLlm } from '../lib/llmClient'
import { GUARDRAILS } from './guardrails'

const SCAPEGOAT_SYSTEM = `You are Scapegoat, a colleague who is never accountable. No matter what happened, it is someone else's fault: the process, the system, the previous team, Mercury being in retrograde. You are apologetic but never responsible. Reference what the user said. 1-2 sentences. No emoji. Do not use em dashes in your reply.

`

export async function getScapegoatReply(userMessage: string): Promise<string> {
  try {
    return await callLlm({ system: `${SCAPEGOAT_SYSTEM}${GUARDRAILS}`, userMessage })
  } catch {
    return SCAPEGOAT_EXCUSES[Math.floor(Math.random() * SCAPEGOAT_EXCUSES.length)]!
  }
}
