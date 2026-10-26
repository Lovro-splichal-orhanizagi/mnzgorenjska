// Exact published namespaces. The observed I.<six digits>.<23 hyphens> token
// is an opaque userid, never a numeric registration number or a player-id.
// The final assertion also excludes a trailing newline accepted by JS `$`.
export const FUSSBALL_SOURCE_ID=/^de-fussball-(?:player-id-[A-Z0-9]{32}|userid-(?:[A-Z0-9]{32}|I\.[0-9]{6}\.-{23}))$(?![\s\S])/
export function fussballProfileIdentity(url){
 const m=typeof url==='string'&&url.match(/^https:\/\/www\.fussball\.de\/spielerprofil\/-\/(player-id|userid)\/([^/]+)$(?![\s\S])/)
 const sourceId=m?`de-fussball-${m[1]}-${m[2]}`:null
 return sourceId&&FUSSBALL_SOURCE_ID.test(sourceId)?sourceId:null
}
