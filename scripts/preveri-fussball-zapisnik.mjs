// Offline validation only. Exit 3 means structurally validated but incomplete;
// callers must never treat that as ready-to-import fantasy statistics.
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {razberiZapisnik,nastopi} from './viri/fussball.mjs'
const [id,main,lineup,manifest]=process.argv.slice(2)
if(!id||!main||!lineup||!manifest){
 console.error('Uporaba: node scripts/preveri-fussball-zapisnik.mjs <match-id> <main.html> <lineup.html> <font-manifest.json>')
 process.exitCode=2
}else try{
 const m=JSON.parse(readFileSync(manifest,'utf8'))
 const fonts=Object.fromEntries(Object.entries(m.fonts).map(([id,f])=>[id,{bytes:readFileSync(resolve(dirname(manifest),f.file)),sha256:f.sha256}]))
 const z=razberiZapisnik(readFileSync(main,'utf8'),readFileSync(lineup,'utf8'),{id,fonts})
 console.log(JSON.stringify({zapisnikId:z.zapisnikId,datum:z.datum,ura:z.ura,krog:z.krog,domaci:z.domaci.ime,gostje:z.gostje.ime,rezultat:z.rezultat,igralci:[z.domaci,z.gostje].map(e=>e.postava.length+e.rezerve.length),goli:z.goli.length,menjave:z.menjave.length,nepripisaniKartoni:z.nepripisaniKartoni.length,nepopoln:z.nepopoln,nastopi:nastopi(z).length,opozorila:z.opozorila},null,2))
 if(z.nepopoln)process.exitCode=3
}catch(e){console.error(e.message);process.exitCode=1}
