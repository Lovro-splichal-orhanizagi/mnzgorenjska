// Closed immutable target DATA. Membership grants no source/native capability.
const targets=Object.freeze({
 'es-ct-segona-g1':Object.freeze({targetSlug:'es-ct-segona-g1',competitionId:783,sourceCode:'4109388-4109627',start:4109388,end:4109627,season:'2026/27',policyId:'es-ct-segona-g1-six-reviewed-2026-10-19-v1'}),
 'es-ct-tercera-g9':Object.freeze({targetSlug:'es-ct-tercera-g9',competitionId:797,sourceCode:'4118349-4118588',start:4118349,end:4118588,season:'2026/27',policyId:'es-ct-tercera-g9-six-reviewed-2026-10-19-v1'}),
})
const fail=()=>{throw Error('FCF_FUTURE_TARGET: exact closed target/source tuple required')}
/** {targetSlug, competitionId?, sourceCode?, season?, id?}; supplied values are
 * checked, never substituted into the fixed catalog. IDs are source strings. */
export function getFcfFutureTarget(input){
 if(!input||Object.getPrototypeOf(input)!==Object.prototype||!Object.hasOwn(input,'targetSlug')||typeof input.targetSlug!=='string'||Object.keys(input).some(k=>!['targetSlug','competitionId','sourceCode','season','id'].includes(k))||!Object.hasOwn(targets,input.targetSlug))fail()
 const target=targets[input.targetSlug]
 for(const k of ['competitionId','sourceCode','season'])if(Object.hasOwn(input,k)&&input[k]!==target[k])fail()
 if(Object.hasOwn(input,'id')&&(typeof input.id!=='string'||!/^[1-9]\d{6}$/.test(input.id)||Number(input.id)<target.start||Number(input.id)>target.end))fail()
 return target
}
