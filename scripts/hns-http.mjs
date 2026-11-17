// Bounded subprocess, no shell. The HNS adapter validates the request before
// calling this and validates status/content/challenges before returning it.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
const execute = promisify(execFile)
const script = fileURLToPath(new URL('./hns-http.py', import.meta.url))

export async function hnsHttp(url, { signal } = {}) {
  const { stdout } = await execute(process.env.SLFF_HNS_PYTHON || 'python3', [script, String(url)], {
    signal, timeout: 28_000, killSignal: 'SIGKILL', maxBuffer: 12 * 1024 * 1024,
    encoding: 'utf8',
  })
  const data = JSON.parse(stdout)
  if (!Number.isInteger(data.status) || data.status < 200 || data.status > 599 ||
      typeof data.body !== 'string' || !data.headers || typeof data.headers !== 'object') {
    throw new Error('Invalid HNS transport response')
  }
  const body = Buffer.from(data.body, 'base64')
  return new Response([204, 205, 304].includes(data.status) ? null : body, {
    status: data.status, headers: data.headers,
  })
}
