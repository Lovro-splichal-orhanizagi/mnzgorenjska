// Installed historical markers skip only the reviewed reports for the exact
// current native source tuple. A single excluded report returns before reads.
import {
  getHistoricalStatisticsPolicy,
  validateInstalledHistoricalStatisticsMarkers,
} from '../lib/historical-statistics-policy.mjs'

export function withReviewedExistingHistoryStatistics(base, competition, { installedHistoricalMarkers } = {}) {
  const fail = message => { throw new Error(`reviewed-existing-history provider: ${message}`) }
  const policy = getHistoricalStatisticsPolicy(competition?.slug)
  if (!policy || !['isthmian', 'hlf', 'nfsbih', 'fmf'].includes(policy.provider) || base?.ime !== policy.provider) fail('invalid reviewed provider')
  const binding = validateInstalledHistoricalStatisticsMarkers({ competition, binding: installedHistoricalMarkers })
  if (!binding) fail('complete installed binding required')
  const sourceIDs = new Set(binding.markers.map(marker => marker.sourceMatchId))
  const reportIDs = new Set(binding.markers.map(marker => marker.reportId))
  const provider = {
    ...base,
    async zapisniki(code, read, options = {}) {
      const archiveCode = policy.competitionSlug === 'gb-npl-midlands' ? 'npl/67d7c7bb74247876e6dae40c/2025-26' : null
      const single = options?.samoZapisnik == null ? null : String(options.samoZapisnik)
      const isArchiveCode = !!archiveCode && code === archiveCode
      if (code !== competition.source_league_code && !isArchiveCode) fail('foreign source code')
      if (isArchiveCode) {
        const archiveEntries = policy.entries.filter(entry => entry.season === '2025/26')
        const archiveSourceIDs = new Set(archiveEntries.map(entry => entry.sourceMatchId))
        const selectedSourceID = single?.replace(/^gb/, '')
        if (archiveEntries.length !== 1 || !selectedSourceID || !archiveSourceIDs.has(selectedSourceID)) fail('NPL archive code permits only the exact excluded single report')
      }
      if (single && (reportIDs.has(single) || sourceIDs.has(single) || sourceIDs.has(single.replace(/^gb/, '')))) return []
      const preskoci = new Set(options?.preskoci ?? [])
      for (const id of sourceIDs) preskoci.add(id)
      for (const id of reportIDs) preskoci.add(id)
      const reports = await base.zapisniki(code, read, { ...options, preskoci })
      if (!Array.isArray(reports)) return reports
      const sourceID = id => policy.provider === 'isthmian' ? id.replace(/^gb/, '') : policy.provider === 'nfsbih' ? id.replace(/^ba/, '') : policy.provider === 'fmf' ? id.replace(/^md/, '') : id
      return reports.filter(report => {
        const id=String(report?.id ?? '')
        return !reportIDs.has(id) && !sourceIDs.has(id) && !sourceIDs.has(sourceID(id))
      })
    },
  }
  return provider
}
