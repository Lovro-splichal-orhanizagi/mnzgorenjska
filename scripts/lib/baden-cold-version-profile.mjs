// Offline reconstruction of immutable predecessor bodies, never a DB transport.
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex')
export function badenVersionPredecessors(){
 const old=read('supabase/migrations/20261028170000_fcf_g1_supplement_native.sql').split('$projection$')[1],forward=read('supabase/migrations/20261028183000_baden_fcf_projection_compat.sql'),full=read('supabase/migrations/20261029141000_fcf_g1_9410_durable.sql'),part=full.split('$projection$')[1],obs=full.split('$projection$')[3];
 const baden=old.replace('\nbegin\n',()=> '\nbegin\n'+forward.split('$addition$')[1]).replace(' -- Removed cleanup goal identities retain target/match association for deleted',()=>forward.split('$guard$')[1]+' -- Removed cleanup goal identities retain target/match association for deleted');
 const body=baden.replace('\nbegin\n',()=> '\nbegin\n'+part.split('$addition$')[1]).replace(part.split('$fkparents_old$')[1],()=>part.split('$fkparents_new$')[1]);
 const observer=baden.replace(' if cid=783 then perform private_fcf_future_target_release.quiet_g9();end if;\n','').replace('\nbegin\n',()=> '\nbegin\n'+obs.split('$addition$')[1]).replace(obs.split('$fkparents_old$')[1],()=>obs.split('$fkparents_new$')[1]).replace("'supplementalMarker',public.get_installed_fcf_g1_supplement(),","'supplementalMarker',public.get_installed_fcf_g1_supplement(),'supplement4109410Marker',public.get_installed_fcf_g1_4109410_supplement(),");
 const active=body.replace('cid in(783,797) and c.slug=p_slug','cid=797 and c.slug=p_slug').replace(' and not c.active and not c.sezona_koledarska',' and not c.sezona_koledarska');
 const rows=[['private_fcf_future_projection.capture(text,text[])',body,'f607b30f1cfbad5b57d7259c6aa1c561c8de8ff78ccb40101446256d0954e5ea'],['private_fcf_g1_readonly.capture(text,text[])',observer,'083cc0d98ad3d6b775ead5db2bebe645f28a4f6dae7fa9766240dac5d2d55bee'],['private_fcf_native800.capture_current(text,text[])',active,'4ed9b02ba84c825891b045cfaccfe45a2ed4ba836628c62587236ce0f2247f07']];
 for(const [,s,h]of rows)if(hash(s)!==h)throw Error('immutable projection reconstruction differs');return rows
}
export function badenVersionSchemaMetadata(){
 const b=badenVersionPredecessors()[0][1],extract=name=>{const m=b.match(new RegExp(name+" jsonb:='([\\s\\S]*?)';"));if(!m)throw Error('missing '+name);let value=JSON.parse(m[1].replaceAll("''","'"));for(const a of b.matchAll(new RegExp(name+":="+name+"\\|\\|'([^']*)'","g")))value=Array.isArray(value)?value.concat(JSON.parse(a[1])):{...value,...JSON.parse(a[1])};return value};
 const registry=extract('registry'),shapes=extract('shapes');let fks=extract('expected_fk');for(const m of b.matchAll(/jsonb_array_elements\(expected_fk\|\|'([^']*)'/g))fks=fks.concat(JSON.parse(m[1]));return {registry,shapes,fks}
}
export function badenLegacyBody(name){
 const file=name==='public.get_fussball_historical_runtime'?'20261028181000_baden_history_runtime_context.sql':name==='private_baden_history.launch_counts'||name==='private_fussball.admission_state'?'20261028182000_baden_composed_native_admission.sql':'20261028180000_baden_history_cards_composition.sql';
 let source=read('supabase/migrations/'+file),start=source.indexOf('create function '+name+'(');if(start<0)throw Error('missing function '+name);const body=source.slice(start).split('$$')[1];return name==='public.get_fussball_historical_runtime'?body.replace("m.statistics_status='available','ordinary fixture cannot acquire historical exclusion'","m.statistics_status in('available','pending_cards'),'ordinary fixture cannot acquire historical exclusion'"):body
}
