// Four local paths/IDs only; no network, registration, import or DB operations.
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'

try{
 const args=process.argv.slice(2),[id,main,lineup,manifest]=args
 if(args.length!==4||args.some(a=>!a))throw Error('Uporaba: node scripts/preveri-fussball-statistiko.mjs <match-id> <main.html> <lineup.html> <font-manifest.json>')
 const m=JSON.parse(readFileSync(manifest,'utf8'))
 const lineupId=m.provenance?.lineupUrl?.match(/^https:\/\/www\.fussball\.de\/ajax\.match\.lineup\/-\/mode\/PAGE\/spiel\/([A-Z0-9]{32})\/ticker-id\/selectedTickerId$/)?.[1]
 const matchId=m.provenance?.matchUrl?.match(/^https:\/\/www\.fussball\.de\/spiel\/(?:[a-z0-9-]+\/)?-\/spiel\/([A-Z0-9]{32})$/)?.[1]
 if(matchId!==id||lineupId!==id)throw Error('Manifest ne veže zapisnika in postave na zahtevano tekmo')
 const fonts=Object.fromEntries(Object.entries(m.fonts).map(([key,f])=>[key,{bytes:readFileSync(resolve(dirname(manifest),f.file)),sha256:f.sha256}]))
 const result=razberiFantasyZapisnik(readFileSync(main,'utf8'),readFileSync(lineup,'utf8'),{id,lineupId,fonts})
 console.log(JSON.stringify(result,null,2))
}catch(e){
 console.log(JSON.stringify({reportStatistikaPripravljena:false,sezonskiUvozPodprt:false,activationEligible:false,nastopi:[],nepripisaniRumeni:[],koda:e.code??'FUSSBALL_REPORT_INVALID',razlog:e.message},null,2))
 process.exitCode=1
}
