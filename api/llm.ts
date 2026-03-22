import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'Server misconfigured' })
    return
  }

  const raw = req.body
  const body =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw as Record<string, unknown> | null) ?? {}

  const system = typeof body.system === 'string' ? body.system : ''
  const userMessage = typeof body.userMessage === 'string' ? body.userMessage : ''
  const maxTokens =
    typeof body.maxTokens === 'number' ? Math.min(120, Math.max(1, body.maxTokens)) : 120
  const temperature =
    typeof body.temperature === 'number' ? Math.min(2, Math.max(0, body.temperature)) : 0.9

  if (!system.trim() || !userMessage.trim()) {
    res.status(400).json({ error: 'Missing system or userMessage' })
    return
  }

  if (userMessage.length > 4000 || system.length > 32000) {
    res.status(400).json({ error: 'Payload too large' })
    return
  }

  const openai = new OpenAI({ apiKey: key })
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    })
    const text = completion.choices[0]?.message?.content?.trim() ?? ''
    res.status(200).json({ text: text.length > 0 ? text : '…' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Upstream error' })
  }
}
