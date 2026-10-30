// Closed reader for the root-archived exact R1 log bytes. DATA only.
import {createHash} from 'node:crypto'

const archivePins=Object.freeze(JSON.parse('{"repository":"Lovro-splichal-orhanizagi/mnzgorenjska","releaseId":416653899,"tag":"fcf-inventory-staging-v1","releaseUrl":"https://api.github.com/repos/Lovro-splichal-orhanizagi/mnzgorenjska/releases/416653899","assetsUrl":"https://api.github.com/repos/Lovro-splichal-orhanizagi/mnzgorenjska/releases/416653899/assets","assetId":690729624,"name":"fcf-g9-r1-job-log-123509832634-f613e0376a17218c0776d325a979687ef281ae7bc9da341c9f2213186bdd189d.log","bytes":24884,"digest":"f613e0376a17218c0776d325a979687ef281ae7bc9da341c9f2213186bdd189d","uploaderId":25134229}'))
const api=`https://api.github.com/repos/${archivePins.repository}`
const prefix=`repos/${archivePins.repository}/`
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const fail=message=>{throw Error(`FCF_G9_ARCHIVED_R1_LOG: ${message}`)}
const need=(value,message)=>{if(!value)fail(message)}

/** Only fixed own-repository paths are accepted by the caller-supplied GET. */
export async function readFcfG9ArchivedR1Log(input){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&Object.keys(input).length===1&&Object.hasOwn(input,'github')&&typeof input.github==='function','closed github-only input required')
 const {github}=input
 const releasePath=prefix+`releases/${archivePins.releaseId}`
 const membersPath=releasePath+'/assets?per_page=100&page=1'
 const rawPath=prefix+`releases/assets/${archivePins.assetId}`
 let release,assets
 try{release=await github(releasePath)}catch{fail('fixed draft release metadata GET failed')}
 need(release&&Object.getPrototypeOf(release)===Object.prototype&&release.id===archivePins.releaseId&&release.tag_name===archivePins.tag&&release.draft===true&&release.url===archivePins.releaseUrl&&release.assets_url===archivePins.assetsUrl,'exact private draft release identity and API URLs required')
 try{assets=await github(membersPath)}catch{fail('fixed draft release asset membership GET failed')}
 need(Array.isArray(assets)&&assets.length<100,'complete bounded release membership list required')
 const matches=assets.filter(asset=>asset?.id===archivePins.assetId)
 need(matches.length===1,'exact archived R1 asset membership required')
 const asset=matches[0]
 const expectedDownload=`https://github.com/${archivePins.repository}/releases/download/${archivePins.tag}/${archivePins.name}`
 need(asset&&Object.getPrototypeOf(asset)===Object.prototype&&asset.id===archivePins.assetId&&asset.name===archivePins.name&&asset.state==='uploaded'&&asset.size===archivePins.bytes&&asset.digest===`sha256:${archivePins.digest}`&&asset.url===api+`/releases/assets/${archivePins.assetId}`&&asset.browser_download_url===expectedDownload&&asset.uploader?.id===archivePins.uploaderId,'exact root-uploaded archived R1 asset metadata required')
 let bytes
 try{bytes=await github(rawPath,true)}catch{fail('fixed archived R1 asset bytes GET failed')}
 need(Buffer.isBuffer(bytes)&&bytes.length===archivePins.bytes&&sha(bytes)===archivePins.digest,'exact archived R1 job log bytes/digest required')
 return bytes
}
