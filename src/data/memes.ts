/** Meme Guy cycles meme1.png … meme30.png from public/memes/ */
export const MEME_FILENAMES: string[] = Array.from(
  { length: 30 },
  (_, i) => `meme${i + 1}.png`,
)
