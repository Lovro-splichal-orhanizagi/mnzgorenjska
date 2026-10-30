// TEST ONLY isolated issuer for synthetic archive metadata; never imported by production.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'

export function makeTestOnlyArchivedR1Reader(descriptor){
 if(!descriptor||Object.getPrototypeOf(descriptor)!==Object.prototype)throw Error('TESTONLY descriptor object required')
 const path=new URL('./fcf-g9-archived-r1-log.mjs',import.meta.url)
 let source=readFileSync(path,'utf8')
 const fixed=/const archivePins=Object\.freeze\(JSON\.parse\('[^']+'\)\)/
 if(!fixed.test(source))throw Error('TESTONLY fixed archive pin location changed')
 source=source.replace(fixed,`const archivePins=Object.freeze(JSON.parse('${JSON.stringify(descriptor)}'))`).replace(/^import .*\n/gm,'').replace(/\bexport /g,'')
 return new Function('createHash',source+'\nreturn {readFcfG9ArchivedR1Log};')(createHash).readFcfG9ArchivedR1Log
}
