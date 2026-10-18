import test from 'node:test'
import assert from 'node:assert/strict'
import {validateHnsWomenClubBindings} from './hns-zenske-binding.mjs'
import {HNS_WOMEN_CLUBS} from './hns-zenske-quality.mjs'
import {mapaKlubov} from '../klubi.mjs'
import hns from './hns.mjs'
const competition={id:99,slug:'hr-prva-hnlz',source:'hns',source_league_code:'114471579',source_policy:'hr-hnlz-v1',date_only_deadline_policy:'midnight-local-v1',country_id:3}
const binding=()=>({competitionId:99,sourceCompetitionId:'114471579',clubs:Object.entries(HNS_WOMEN_CLUBS).map(([sourceClubId,canonicalName],i)=>({sourceClubId,canonicalName,teamId:100+i,countryId:3}))})
test('all8native organizations bind exactHRDBidentities and preserve canonical source names independently of display names',()=>{
 const b=binding(),result=validateHnsWomenClubBindings(competition,b)
 assert.deepEqual(result,b.clubs);assert.ok(Object.isFrozen(result)&&Object.isFrozen(result[0]));b.clubs[0].teamId=999;assert.notEqual(result[0].teamId,999)
})
for(const [name,mutate]of Object.entries({partial:b=>b.clubs.pop(),duplicate:b=>b.clubs[1].teamId=b.clubs[0].teamId,foreigncountry:b=>b.clubs[0].countryId=2,foreignnative:b=>b.clubs[0].sourceClubId='unknown',canonicalname:b=>b.clubs[0].canonicalName='Guessed alias',foreigncompetition:b=>b.competitionId=98,foreignscope:b=>b.sourceCompetitionId='100511683'}))test(`clubbinding failsclosed:${name}`,()=>{const b=binding();mutate(b);assert.throws(()=>validateHnsWomenClubBindings(competition,b),/HNS|binding|identity/i)})
function db(teams){const rows={countries:[{id:3,code:'HR'}],teams,competitions:[],competition_teams:[]};return{from(t){let data=rows[t];const q={select(){return q},eq(k,v){data=data.filter(r=>r[k]===v);return q},order(){return q},range(a,b){return Promise.resolve({data:data.slice(a,b+1)})},maybeSingle(){return Promise.resolve({data:data[0]})},then(resolve){return Promise.resolve({data}).then(resolve)}};return q}}}
test('actualclubmap uses installednativeID over renameddisplay or an unrelatedsame-name organization',async()=>{
 const bindings=validateHnsWomenClubBindings(competition,binding()),teams=bindings.map(b=>({id:b.teamId,name:`Renamed display ${b.teamId}`,country_id:3}))
 teams.push({id:999,name:bindings[0].canonicalName,country_id:3})
 const map=await mapaKlubov(db(teams),{...hns,reviewedClubBindings:bindings})
 for(const b of bindings)assert.equal(map.get(hns.kljucKluba(b.canonicalName)),b.teamId)
 const ordinary=await mapaKlubov(db(teams),hns);assert.equal(ordinary.get(hns.kljucKluba(bindings[0].canonicalName)),999)
})
test('reviewedclubmap refuses absent/country-filteredDBteam before any creation',async()=>{
 const bindings=validateHnsWomenClubBindings(competition,binding())
 await assert.rejects(()=>mapaKlubov(db([]),{...hns,reviewedClubBindings:bindings}),/reviewed|country|team|club/i)
})
