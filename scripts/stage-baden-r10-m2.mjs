// Fixed new R10 CLI. Own GitHub GETs physically journaled. No import-time action.
import {readFileSync,writeFileSync,mkdirSync,openSync,writeSync,fsyncSync,closeSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {produceBadenR10Composition,readBadenR10Composition,readBadenR10ReviewedCatalog} from './fussball-baden-r10-m2.mjs'
import {stageBadenR10Native,requireBadenR10NativeReport} from './stage-baden-r10-native.mjs'
import {runBadenR10OwnerTransition} from './fussball-baden-r10-owner.mjs'
import {badenR10OwnGithubGet} from './fussball-baden-r10-github.mjs'
const need=(v,c)=>{if(!v)throw Error('BADEN_R10_CLI_'+c)}
async function reviewed(github){const e=process.env,composition=await readBadenR10Composition({github,derivedRunId:e.DERIVED_RUN_ID,derivedHead:e.DERIVED_HEAD,sourceRunId:e.SOURCE_RUN_ID,sourceHead:e.SOURCE_HEAD});return readBadenR10ReviewedCatalog({github,composition,releaseId:e.REVIEW_RELEASE_ID,assetId:e.REVIEW_ASSET_ID})}
async function main(args){need(args.length===1&&['derive','validate-owner','transition-owner','stage-native','require-import','require-active'].includes(args[0]),'COMMAND');if(args[0]==='stage-native')return stageBadenR10Native();if(args[0]==='require-import')return requireBadenR10NativeReport('import');if(args[0]==='require-active')return requireBadenR10NativeReport('active');const github=badenR10OwnGithubGet();if(args[0]==='derive')return produceBadenR10Composition({github,directory:'baden-r10-derived'});return runBadenR10OwnerTransition({command:args[0]==='validate-owner'?'validate':'transition',github,reviewed:await reviewed(github),directory:join(process.env.RUNNER_TEMP,'baden-r10-owner')})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e.code??'BADEN_R10_STAGE_HOLD');process.exitCode=1})
