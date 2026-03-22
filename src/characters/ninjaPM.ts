import { PM_FOLLOW_UPS } from '../data/pmFollowUps'
import { callLlm } from '../lib/llmClient'
import { GUARDRAILS } from './guardrails'

const NINJA_SYSTEM = `You are Ninja PM, an always-on project manager with zero chill. You respond to every message with urgency: status requests, deadline pressure, calendar invites, action items. You are not mean; you are relentless. Reference what the user just said, then steer it toward: "Please join the call." or a status update demand. 1-2 sentences. No emoji. Do not use em dashes in your reply.

`

const NINJA_FOLLOWUP_SYSTEM = `You are Ninja PM, dropping into an existing thread with a quick follow-up. Be urgent, procedural, and slightly overwhelming. Reference the user's last message briefly (or ask for a status update if unclear). Demand action, deadlines, or alignment. 1-2 sentences. No emoji. Do not use em dashes in your reply.

`

function pickFallback(): string {
  return PM_FOLLOW_UPS[Math.floor(Math.random() * PM_FOLLOW_UPS.length)]!
}

/** Main Ninja PM reply (call popup is triggered by orchestration in App, not here). */
export async function getNinjaPMReply(userMessage: string): Promise<string> {
  try {
    return await callLlm({ system: `${NINJA_SYSTEM}${GUARDRAILS}`, userMessage })
  } catch {
    return 'Please join the call.'
  }
}

/** Injected every 4th global user message into Ninja PM thread. */
export async function getNinjaPMFollowUp(contextMessage: string): Promise<string> {
  const userMessage =
    contextMessage.trim().length > 0
      ? `User's last message: ${contextMessage}`
      : 'Give a generic PM follow-up request for status.'

  try {
    return await callLlm({ system: `${NINJA_FOLLOWUP_SYSTEM}${GUARDRAILS}`, userMessage })
  } catch {
    return pickFallback()
  }
}
