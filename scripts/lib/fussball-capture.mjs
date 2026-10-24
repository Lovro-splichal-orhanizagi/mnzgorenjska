import { createHash } from 'node:crypto'

const BASE = 'https://www.fussball.de'
const MIN_GAP_MS = 6000
const TIMEOUT_MS = 30_000
const HTML_LIMIT = 8 * 1024 * 1024
const CSS_LIMIT = 64 * 1024
const WOFF_LIMIT = 8 * 1024 * 1024
const KINDS = new Set(['round', 'report', 'lineup', 'css', 'font'])
const WOFF_MIME = new Set(['font/woff', 'application/font-woff', 'application/x-font-woff', 'application/octet-stream'])

const fail = message => new Error(`fussball capture: ${message}`)
const timestamp = milliseconds => new Date(milliseconds).toISOString()
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

/** Exact supported public round routes, including observed calendar-day seeds. */
export function fussballRoundScope(url) {
  if (typeof url !== 'string') return null
  const m = url.match(/^https:\/\/www\.fussball\.de\/spieltag\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?-\/(?:(?:spieltag\/([1-9]\d{0,2})|spieldatum\/(20\d{2}-\d{2}-\d{2}))\/)?staffel\/([A-Z0-9]{32}-G)$/)
  if (!m) return null
  if (m[2] && (!Number.isFinite(Date.parse(m[2] + 'T00:00:00Z')) || new Date(m[2] + 'T00:00:00Z').toISOString().slice(0, 10) !== m[2])) return null
  return {staffel:m[3],round:m[1] ? Number(m[1]) : null,date:m[2] ?? null}
}

function routeKind(url, kind) {
  if (typeof url !== 'string' || !url || /[\s\\]/.test(url)) throw fail('invalid source URL')
  if (!KINDS.has(kind)) throw fail(`unsupported document kind ${String(kind)}`)
  const match = /^https:\/\/([^/?#]+)(\/[^?#]*)$/.exec(url)
  if (!match || match[1] !== 'www.fussball.de') throw fail('URL must use HTTPS www.fussball.de without credentials, port, query or fragment')
  let parsed
  try { parsed = new URL(url) } catch { throw fail('invalid source URL') }
  if (parsed.origin !== BASE || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.href !== url)
    throw fail('URL must use HTTPS www.fussball.de without credentials, port, query or fragment')

  const slug = '(?:[a-z0-9]+(?:-{1,2}[a-z0-9]+)*/)?'
  const id = '[A-Z0-9]{32}'
  const path = parsed.pathname
  const matches = {
    round: fussballRoundScope(url) !== null,
    report: new RegExp(`^/spiel/${slug}-/spiel/${id}$`).test(path),
    lineup: new RegExp(`^/ajax\\.match\\.lineup/-/mode/PAGE/spiel/${id}(?:/ticker-id/selectedTickerId)?$`).test(path),
    css: /^\/export\.fontface\/-\/id\/[a-z0-9]{8}\/type\/css$/.test(path),
    font: /^\/export\.fontface\/-\/format\/woff\/id\/[a-z0-9]{8}\/type\/font$/.test(path),
  }
  if (!matches[kind]) throw fail(`URL route is not allowed for ${kind}`)
}

function mimeFor(contentType) {
  return String(contentType ?? '').split(';', 1)[0].trim().toLowerCase()
}

function validateMime(kind, contentType) {
  const mime = mimeFor(contentType)
  const valid = ['round', 'report', 'lineup'].includes(kind)
    ? mime === 'text/html'
    : kind === 'css'
      ? mime === 'text/css'
      : WOFF_MIME.has(mime)
  if (!valid) throw fail(`unexpected MIME type for ${kind}: ${contentType || '(missing)'}`)
}

async function readBounded(response, limit) {
  const declared = response.headers.get('content-length')
  const contentEncoding = String(response.headers.get('content-encoding') ?? '').trim().toLowerCase()
  const encodings = contentEncoding ? contentEncoding.split(',').map(value => value.trim()).filter(Boolean) : []
  if (encodings.some(encoding => !['identity', 'gzip', 'br', 'deflate'].includes(encoding)))
    throw fail(`unsupported Content-Encoding: ${contentEncoding}`)
  if (declared != null) {
    if (!/^\d+$/.test(declared)) throw fail('invalid Content-Length')
    if (Number(declared) > limit) throw fail('document exceeds byte limit')
  }
  if (!response.body) throw fail('response has no body')
  const reader = response.body.getReader()
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) {
        await reader.cancel().catch(() => {})
        throw fail('document exceeds byte limit')
      }
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }
  if (!encodings.some(encoding => encoding !== 'identity') && declared != null && length !== Number(declared))
    throw fail('response body length does not match Content-Length')
  if (!length) throw fail('empty source document')
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function cancelUnreadBody(response) {
  if (!response?.body || response.body.locked) return
  try { await response.body.cancel() } catch {}
}

function detectChallenge(bytes, kind) {
  if (!['round', 'report', 'lineup'].includes(kind)) return
  const text = new TextDecoder().decode(bytes)
  if (/<title>\s*(?:Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(text))
    throw fail('source challenge detected')
}

export function createFussballCaptureClient({
  maxRequests,
  fetchFn = globalThis.fetch,
  now = Date.now,
  sleep = pause,
  onAttempt,
  onDocument,
} = {}) {
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 4000)
    throw fail('request budget must be an integer from 1 to 4000')
  if (typeof fetchFn !== 'function' || typeof now !== 'function' || typeof sleep !== 'function')
    throw fail('fetchFn, now and sleep must be functions')
  if (onAttempt != null && typeof onAttempt !== 'function') throw fail('onAttempt must be a function')
  if (onDocument != null && typeof onDocument !== 'function') throw fail('onDocument must be a function')

  const cache = new Map()
  const attempts = []
  let requestCount = 0
  let stoppedBy = null
  let lastStartedAt = null
  let queue = Promise.resolve()

  const stop = error => {
    stoppedBy ??= error instanceof Error ? error : fail(String(error))
    return stoppedBy
  }

  const waitForTurn = async () => {
    if (lastStartedAt == null) return
    const delay = MIN_GAP_MS - (now() - lastStartedAt)
    if (delay > 0) await sleep(delay)
  }

  const performRead = async (url, kind) => {
    if (stoppedBy) throw fail(`client stopped after ${stoppedBy.message}`)
    let response = null
    try {
      routeKind(url, kind)
      if (cache.has(url)) {
        const saved = cache.get(url)
        return { ...saved, bytes: new Uint8Array(saved.bytes) }
      }
      if (requestCount >= maxRequests) throw fail(`request budget exhausted (${maxRequests})`)

      const attempt = { number: requestCount + 1, url, kind, startedAt: null, status: 'pending', error: null }
      attempts.push(attempt)
      if (onAttempt) await onAttempt({ ...attempt })
      if (stoppedBy) throw fail(`client stopped after ${stoppedBy.message}`)
      await waitForTurn()
      if (stoppedBy) throw fail(`client stopped after ${stoppedBy.message}`)

      const started = now()
      lastStartedAt = started
      attempt.startedAt = timestamp(started)
      attempt.status = 'started'
      requestCount++
      response = await fetchFn(url, {
        method: 'GET',
        headers: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!(response instanceof Response)) throw fail('fetchFn did not return a Web Response')
      attempt.httpStatus = response.status
      if (response.status >= 300 && response.status < 400) throw fail(`redirect refused (HTTP ${response.status})`)
      if (response.status !== 200) throw fail(`source request failed (HTTP ${response.status})`)
      if (response.redirected || (response.url && response.url !== url)) throw fail('redirected response refused')
      const contentType = response.headers.get('content-type')
      validateMime(kind, contentType)
      const limit = kind === 'css' ? CSS_LIMIT : kind === 'font' ? WOFF_LIMIT : HTML_LIMIT
      const bytes = await readBounded(response, limit)
      detectChallenge(bytes, kind)

      const document = {
        url,
        kind,
        bytes,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        status: response.status,
        contentType,
        capturedAt: timestamp(started),
      }
      if (onDocument) await onDocument({ ...document, bytes: new Uint8Array(bytes) })
      const saved = { ...document, bytes: new Uint8Array(bytes) }
      cache.set(url, saved)
      attempt.status = 'success'
      return { ...saved, bytes: new Uint8Array(saved.bytes) }
    } catch (error) {
      await cancelUnreadBody(response)
      const terminal = stop(error)
      const attempt = attempts.at(-1)
      if (attempt && attempt.status !== 'success') {
        attempt.status = 'failed'
        attempt.error = terminal.message
      }
      throw terminal
    }
  }

  return {
    get requestLimit() { return maxRequests },
    read(url, kind) {
      const result = queue.then(() => performRead(url, kind))
      queue = result.catch(() => undefined)
      return result
    },
    snapshot() {
      return {
        requests: requestCount,
        attempts: attempts.map(attempt => ({ ...attempt })),
        stopped: stoppedBy != null,
        stopReason: stoppedBy?.message ?? null,
      }
    },
  }
}
