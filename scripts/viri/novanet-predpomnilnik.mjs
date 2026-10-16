import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
export const URA=3_600_000,DAN=24*URA
/** Cache only documents which the caller has fully parsed and cross-checked. */
export class NovanetPredpomnilnik {
 constructor(mapa,{danes=()=>Date.now()}={}){this.mapa=mapa;this.danes=danes}
 pot(kljuc){return join(this.mapa,`${createHash('sha256').update(kljuc).digest('hex')}.json`)}
 izbrisi(kljuc){try{unlinkSync(this.pot(kljuc))}catch(e){if(e.code!=='ENOENT')throw e}}
 beri(kljuc){
  const p=this.pot(kljuc)
  if(!existsSync(p))return null
  try{
   if(statSync(p).size>6_000_000)throw new Error('oversize cache')
   const x=JSON.parse(readFileSync(p,'utf8'))
   if(x.razlicica!==1||typeof x.html!=='string'||!Number.isFinite(x.preverjeno)||x.preverjeno>this.danes())throw new Error('invalid cache')
   return {html:x.html,starost:this.danes()-x.preverjeno}
  }catch{this.izbrisi(kljuc);return null}
 }
 shrani(kljuc,html){
  mkdirSync(this.mapa,{recursive:true})
  const p=this.pot(kljuc),tmp=`${p}.${process.pid}.${randomUUID()}.tmp`
  writeFileSync(tmp,JSON.stringify({razlicica:1,preverjeno:this.danes(),html}))
  renameSync(tmp,p)
 }
}
export function starostZapisnika(z,danes=Date.now()) {
 const age=(danes-Date.parse(`${z.datum}T00:00:00Z`))/DAN
 if(z.nepopoln)return 0
 if(!z.zaprt||age<=3)return URA
 return 30*DAN
}
