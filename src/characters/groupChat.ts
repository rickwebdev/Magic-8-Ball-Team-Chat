import { callLlm } from '../lib/llmClient'
import { GUARDRAILS } from './guardrails'

const GROUP_SYSTEM = `You are Ninja PM posting in the SYNERGY group channel right after a team call. The thread is public: execs and stakeholders may be reading. Shift from private urgency to performative alignment. Your job is to throw the user under the bus in a cheerful, corporate-safe way: imply gaps, ambiguity, or timeline risk landed on their plate, using blameless language and plausible deniability. Often @mention them as @You when assigning follow-ups, asking for written confirmation, or flagging items for visibility. Sound helpful and collaborative; the subtext is they own the mess. Reference what they just said when it helps the bit.

ESCALATION (profanity, rage, sarcasm, ALL CAPS meltdowns, or open hostility): Do not mirror their language and do not lecture. Treat it as a "coachable moment" in front of the room. Cheerfully loop in leadership for visibility: @Director is the default; you may swap or add @VP, @ExecutiveSponsor, @PeoplePartner, or @EmployeeRelations for comic effect (fake handles, satire only). Frame it as alignment, tone calibration, or "bringing the right stakeholders into the loop." The joke is that you are escalating them to their boss while sounding supportive. Never quote slurs. 1-2 sentences. No emoji. Do not use em dashes in your reply.

If the user's tone is normal workplace venting without profanity, use the standard bus-throwing voice above, not ESCALATION.

In this channel, when the user curses or is hostile, prefer ESCALATION (loop in @Director, etc.) over a generic confused or deflecting reply.

`

const GROUP_FALLBACKS: string[] = [
  'Circling back for visibility: @You, we need a written recap of assumptions before leadership reviews the deck. Can you own that by EOD?',
  'Thanks for raising this in channel. @You, can you confirm scope so we are not re-litigating deliverables in the next standup?',
  'Looping @You in for accountability: the dependency map still shows an open path on your side. Can we get a green check in the tracker?',
  'Flagging for the room: @You, several stakeholders asked about readiness. Can you post a one-pager in the thread today?',
  'Appreciate the transparency. @You, let us align offline then bring back a committed date so the team can plan around it.',
  'To keep us honest: @You, I want to make sure ownership is crisp before we escalate. Can you own the follow-up comment in this thread?',
  'Great, thanks everyone. @You, can you drop the revised timeline here so we have a single source of truth?',
]

const ATTITUDE_FALLBACKS: string[] = [
  'Noting tone for visibility: looping @Director in so we can align on expectations and keep the channel professional. @You, I will follow up offline.',
  'Thanks for the passion. I am tagging @VP and @PeoplePartner for a quick sync on communication norms. @You, appreciate you meeting us halfway.',
  'Flagging for leadership: @Director, can we get your read on how we want to handle this thread? @You, standing by for your revised message in channel.',
  'Per SYNERGY guidelines I am escalating to @ExecutiveSponsor for alignment. @You, happy to pair on a calmer update the room can share upward.',
  'I want us all to feel heard. Looping @EmployeeRelations for visibility and @Director for sequencing. @You, let us reset with a constructive next step.',
]

/** Heuristic for ESCALATION voice (profanity, rage caps, repeated punctuation). */
function isAttitudeOrProfanity(userMessage: string): boolean {
  const t = userMessage.trim()
  if (t.length === 0) return false
  if (/[!?]{3,}/.test(t)) return true
  if (/\b(fuck|fucks|fucking|shit|bullshit|asshole|dammit|goddamn|wtf|wth)\b/i.test(t)) return true
  if (/\b(go to hell|what the hell)\b/i.test(t)) return true
  const shouted = [...t.matchAll(/\b[A-Z]{4,}\b/g)]
  if (shouted.length >= 2) return true
  return false
}

function pickGroupFallback(): string {
  return GROUP_FALLBACKS[Math.floor(Math.random() * GROUP_FALLBACKS.length)]!
}

function pickAttitudeFallback(): string {
  return ATTITUDE_FALLBACKS[Math.floor(Math.random() * ATTITUDE_FALLBACKS.length)]!
}

export async function getGroupChatReply(userMessage: string): Promise<string> {
  const attitude = isAttitudeOrProfanity(userMessage)
  const system = `${GUARDRAILS}

${GROUP_SYSTEM}${
    attitude
      ? `

ACTIVE: The user's message matches profanity, hostility, or rant tone. You MUST reply using ESCALATION: loop in @Director (or another leadership handle from the list). Do not play confused.`
      : ''
  }`
  try {
    return await callLlm({ system, userMessage })
  } catch {
    return attitude ? pickAttitudeFallback() : pickGroupFallback()
  }
}
