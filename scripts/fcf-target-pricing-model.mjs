import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
export function fcfTargetPricingModelSha256(){
 const h=createHash('sha256')
 for(const file of['ovrednoti-igralce.mjs','visja-liga.mjs','premik-cene.mjs'])h.update(file+'\0').update(readFileSync(new URL(file,import.meta.url))).update('\0')
 return h.digest('hex')
}
