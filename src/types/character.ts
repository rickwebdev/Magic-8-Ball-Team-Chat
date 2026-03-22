/** Outcome bucket selected in code for Synergy Bot; LLM only phrases it. */
export type OutcomeBucket = 'yes' | 'no' | 'maybe' | 'ghosted'

export interface CharacterConfig {
  id: string
  name: string
  typingDelayMs: number
}
