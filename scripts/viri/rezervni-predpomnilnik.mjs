import { existsSync, readFileSync } from 'node:fs'
// A source that owns a validated cache must not acquire a second unvalidated
// cache through the generic schedule transport's outage fallback.
export function preberiRezervo(pot,vir,ime) {
 if(!existsSync(pot))return null
 const html=readFileSync(pot,'utf8')
 return (vir.zaPredpomnilnik?.(html,ime)??true)?html:null
}
