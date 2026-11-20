import { vseVrstice } from './strani.mjs'

// An absent or partial observation must never become a healthy empty result.
// Callers supply SQL filters and a unique order before the page range.
export function vrsticePreverbe(query) {
  return vseVrstice(async (from, to) => {
    const response = await query(from, to)
    if (!response || (!response.error && !Array.isArray(response.data))) {
      throw new Error('Manjka veljaven odgovor baze.')
    }
    return response
  })
}
