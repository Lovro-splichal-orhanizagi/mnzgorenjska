// Separate installed supplement, composed inside the unchanged six-marker adapter.
import {requireFcfG1InstalledSupplement,fcfG1SupplementCalendar,isFcfG1SupplementReport} from '../lib/fcf-g1-supplement-installed.mjs'
import {preberiBlok} from './fcf.mjs'
export function withFcfG1InstalledSupplement(base,competition,{installedG1Supplement,readBlock=preberiBlok}={}){
 if(base?.ime!=='fcf'||typeof readBlock!=='function')throw Error('FCF G1 installed supplement: exact provider/block reader required; HOLD')
 const input={competition,installedG1Supplement}
 requireFcfG1InstalledSupplement(input)
 const check=code=>{requireFcfG1InstalledSupplement(input);if(code!==competition.source_league_code)throw Error('FCF G1 installed supplement: foreign block; HOLD')}
 const merge=options=>({...options,preskoci:new Set([...(options.preskoci??[]),'es4109409']),historicalFixtures:[...(options.historicalFixtures??[]),fcfG1SupplementCalendar(input)]})
 return {
  provider:{...base,
   async zapisniki(code,read,options={}){check(code);if(isFcfG1SupplementReport({...input,id:options.samoZapisnik}))return [];return base.zapisniki(code,read,merge(options))},
   posamezniZapisnik(code,options){check(code);if(isFcfG1SupplementReport({...input,id:options?.id}))return async()=>[];return base.posamezniZapisnik(code,options)},
  },
  readBlock(code,read,options={}){check(code);return readBlock(code,read,merge(options))},
 }
}
