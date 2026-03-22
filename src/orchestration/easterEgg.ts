const CREDIT_EASTER_EGG = /who made this( app)?/i

/** Hardcoded credit; skip LLM entirely when matched. */
export function isEasterEggCreditQuestion(q: string): boolean {
  return CREDIT_EASTER_EGG.test(q.trim())
}

export const CREDIT_LINK = 'https://rickthewebdev.com/'
