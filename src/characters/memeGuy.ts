import { MEME_FILENAMES } from '../data/memes'

/** No LLM: returns next unused meme filename; resets pool when exhausted. */
export function nextMemeFilename(used: string[]): { filename: string; usedNext: string[] } {
  let available = MEME_FILENAMES.filter((m) => !used.includes(m))
  let usedNext = used
  if (available.length === 0) {
    usedNext = []
    available = [...MEME_FILENAMES]
  }
  const filename = available[Math.floor(Math.random() * available.length)]!
  return { filename, usedNext: [...usedNext, filename] }
}
