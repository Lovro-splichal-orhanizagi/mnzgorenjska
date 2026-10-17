-- Preserve the reviewed canonical-statistics/locking guard unchanged and private.
create schema private_dfb_release;
revoke all on schema private_dfb_release from public,anon,authenticated,service_role;
alter function public.varen_vklop_dfb_regije(text,text,boolean) set schema private_dfb_release;
revoke all on function private_dfb_release.varen_vklop_dfb_regije(text,text,boolean) from public,anon,authenticated,service_role;

create function public.varen_vklop_dfb_regije(p_manifest text,p_sha256 text,p_aktiviraj boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb; s jsonb; c jsonb; r jsonb; x jsonb; generated timestamptz; captured timestamptz; canonical text; result jsonb;
begin
 if p_manifest is null or octet_length(p_manifest)>8388608 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
    or encode(sha256(convert_to(p_manifest,'UTF8')),'hex')<>p_sha256 then raise exception 'DE_RELEASE: reviewed manifest SHA/size mismatch'; end if;
 v:=p_manifest::jsonb;
 if v->>'version'='1' then
  if exists(select 1 from jsonb_array_elements(v->'seasons') as item(value) where item.value ? 'lineage') then raise exception 'DE_RELEASE: replay requires version2'; end if;
  return private_dfb_release.varen_vklop_dfb_regije(p_manifest,p_sha256,p_aktiviraj);
 end if;
 if v->>'version' is distinct from '2' or jsonb_typeof(v->'seasons') is distinct from 'array' or jsonb_array_length(v->'seasons')<>2 then raise exception 'DE_RELEASE: invalid replay manifest'; end if;
 for s in select value from jsonb_array_elements(v->'seasons') loop
  c:=s#>'{lineage,capture}';r:=s#>'{lineage,replay}';
  foreach x in array array[c,r] loop
   if jsonb_typeof(x) is distinct from 'object'
    or coalesce(x->>'runId','') !~ '^[1-9][0-9]{0,19}$' or coalesce(x->>'jobId','') !~ '^[1-9][0-9]{0,19}$'
    or coalesce(x->>'commit','') !~ '^[a-f0-9]{40}$' or coalesce(x->>'parserSha256','') !~ '^[a-f0-9]{64}$'
    or coalesce(x->>'workflowSha256','') !~ '^[a-f0-9]{64}$' or coalesce(x->>'artifactId','') !~ '^[1-9][0-9]{0,19}$'
    or coalesce(x->>'artifactDigest','') !~ '^sha256:[a-f0-9]{64}$' then raise exception 'DE_RELEASE: invalid replay execution identity'; end if;
  end loop;
  if c->>'workflow' is distinct from '.github/workflows/preveri-dfb-ligo.yml'
   or c->>'step' is distinct from (case s->>'season' when '2025/26' then 'Arhiv sezona — brez baze' when '2026/27' then 'Tekoča sezona — brez baze' end)
   or coalesce(c->>'conclusion','') not in('success','failure') or c->>'runId'=r->>'runId'
   or coalesce(c->>'indexSha256','') !~ '^[a-f0-9]{64}$'
   or c->>'documentsSha256' is distinct from s->>'documentsSha256' or c->>'capturedAt' is distinct from s->>'capturedAt'
   or r->>'workflow' is distinct from '.github/workflows/ponovi-dfb-regijo.yml' or r->>'step' is distinct from 'Ponovi sezono — brez omrežja in baze'
   or r->>'runId' is distinct from s->>'runId' or r->>'jobId' is distinct from s->>'jobId'
   or r->>'commit' is distinct from v->>'sourceCommit' or r->>'parserSha256' is distinct from v->>'parserSha256'
   then raise exception 'DE_RELEASE: changed replay lineage'; end if;
  begin
   generated:=(r->>'generatedAt')::timestamptz;captured:=(c->>'capturedAt')::timestamptz;
  exception when others then raise exception 'DE_RELEASE: invalid replay timestamp'; end;
  if generated is null or captured is null or not isfinite(generated) or not isfinite(captured) or generated<captured or generated>clock_timestamp()+interval '5 minutes' then raise exception 'DE_RELEASE: invalid replay generation time'; end if;
 end loop;
 -- Original freshness and every fixture/statistic/readiness/lock condition are
 -- still checked by the same function body, within this transaction.
 canonical:=jsonb_set(v,'{version}','1')::text;
 result:=private_dfb_release.varen_vklop_dfb_regije(canonical,encode(sha256(convert_to(canonical,'UTF8')),'hex'),p_aktiviraj);
 return result||jsonb_build_object('manifestSha256',p_sha256);
end $$;
revoke all on function public.varen_vklop_dfb_regije(text,text,boolean) from public,anon,authenticated;
grant execute on function public.varen_vklop_dfb_regije(text,text,boolean) to service_role;
comment on function public.varen_vklop_dfb_regije(text,text,boolean) is 'Service-only v1 direct / v2 independently audited replay; original freshness and unchanged private canonical guard.';
