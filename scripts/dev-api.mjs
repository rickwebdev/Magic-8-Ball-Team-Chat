/**
 * Local dev only: mirrors api/llm.ts so `npm run dev` + Vite proxy can reach OpenAI.
 * Loads .env.local (and .env) from the project root.
 */
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpenAI } from 'openai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const p = join(root, name)
    if (!existsSync(p)) continue
    const text = readFileSync(p, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
}

loadEnvFiles()

const PORT = Number(process.env.DEV_API_PORT) || 8787

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS' && req.url?.startsWith('/api')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.url !== '/api/llm' || req.method !== 'POST') {
    res.statusCode = 404
    res.end()
    return
  }

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'missing OPENAI_API_KEY in .env.local' }))
    return
  }

  let raw = ''
  for await (const chunk of req) {
    raw += chunk
  }

  let body = {}
  try {
    body = JSON.parse(raw || '{}')
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const system = typeof body.system === 'string' ? body.system : ''
  const userMessage = typeof body.userMessage === 'string' ? body.userMessage : ''
  const maxTokens =
    typeof body.maxTokens === 'number' ? Math.min(120, Math.max(1, body.maxTokens)) : 120
  const temperature =
    typeof body.temperature === 'number' ? Math.min(2, Math.max(0, body.temperature)) : 0.9

  if (!system.trim() || !userMessage.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing system or userMessage' }))
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
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: text.length > 0 ? text : '…' }))
  } catch (e) {
    console.error('[dev-api]', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Upstream error' }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dev-api] listening on http://127.0.0.1:${PORT} (proxied by Vite as /api/*)`)
})
