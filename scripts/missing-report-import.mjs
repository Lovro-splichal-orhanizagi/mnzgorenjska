// Opt-in catch-up of current reports. Ordinary active-league refreshes are unchanged.
export function requireMissingReportImportScope({competition,leagueCode,sourceOverride,singleReport}) {
 if(competition?.active!==false||!['eps','hlf'].includes(competition.source)||competition.source_policy||competition.date_only_deadline_policy||leagueCode!==competition.source_league_code||sourceOverride||singleReport)
  throw Error('Missing-only import requires an inactive current-season EPS or HLF league without overrides or custom policy.')
}
export function completedReportIds(rows) {
 return new Set(rows.filter(r=>r.imported_at!=null&&r.zapisnik_id!=null).map(r=>String(r.zapisnik_id)))
}
