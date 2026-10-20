// Keep the parser inspectable; production writes must never invent an on-field red clock.
export function assertMfaReportTiming(z){
 const fail=message=>{throw Error(`MFA report validation: ${message}`)}
 if(!z||typeof z!=='object')fail('normal report required')
 const minute=m=>Number.isInteger(m)&&m>=0&&m<=90
 const players=[z.domaci,z.gostje].map(team=>new Set([...(team?.postava??[]),...(team?.rezerve??[])].map(p=>p.regSt)))
 const appeared=[z.domaci,z.gostje].map(team=>new Set((team?.postava??[]).map(p=>p.regSt)))
 for(const change of z.menjave??[]){
  if(!minute(change.minuta)||!players[change.ekipaIdx]?.has(change.noter?.regSt)||!players[change.ekipaIdx]?.has(change.ven?.regSt)||!Number.isSafeInteger(change.noter?.regSt)||!Number.isSafeInteger(change.ven?.regSt))fail('substitution identity/minute missing')
  appeared[change.ekipaIdx].add(change.noter.regSt)
 }
 for(const event of [...(z.goli??[]),...(z.zgresene??[])])if(!minute(event.minuta)||!Number.isSafeInteger(event.regSt)||!appeared[event.ekipaIdx]?.has(event.regSt))fail('scorer identity/minute missing')
 for(const red of z.rdeci??[])if(appeared[red.ekipaIdx]?.has(red.regSt)&&!minute(red.minuta))fail('on-field dismissal minute missing; normal statistics cannot be derived')
 return z
}
