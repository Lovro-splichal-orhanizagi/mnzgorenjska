-- Read-only observer only: preserve the deployed projection and every mutator.
-- Abort before any DDL unless the exact reviewed 17+183 body is installed.
do $precondition$
declare p pg_proc;
begin
 select *into strict p from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure;
 if p.prorettype<>'jsonb'::regtype or p.prokind<>'f' or p.provolatile<>'s' or not p.prosecdef or p.prolang<>(select oid from pg_language where lanname='plpgsql')or p.proconfig is distinct from array['search_path=public, pg_temp']::text[] or encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')<>'ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f'then
  raise exception 'FCF_G1_READONLY: exact reviewed projection signature/body required';
 end if;
end $precondition$;
create schema private_fcf_g1_readonly;
revoke all on schema private_fcf_g1_readonly from public,anon,authenticated,service_role;
do $copy$
declare body text;patched text;definition text;
begin
 select prosrc into strict body from pg_proc where oid='private_fcf_future_projection.capture(text,text[])'::regprocedure;
 if encode(sha256(convert_to(body,'UTF8')),'hex')<>'ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f'then raise exception 'FCF_G1_READONLY: projection changed';end if;
 patched:=replace(body,E' if cid=783 then perform private_fcf_future_target_release.quiet_g9();end if;\n','');
 if encode(sha256(convert_to(patched,'UTF8')),'hex')<>'a55fa3e6380782cac0640e5d82dcb74f789a978ec9fc6d9790b1e830a30063b5'then raise exception 'FCF_G1_READONLY: exact observer body required';end if;
 definition:=pg_get_functiondef('private_fcf_future_projection.capture(text,text[])'::regprocedure);
 execute replace(replace(definition,'private_fcf_future_projection.capture(','private_fcf_g1_readonly.capture('),body,patched);
end $copy$;
revoke all on function private_fcf_g1_readonly.capture(text,text[])from public,anon,authenticated,service_role;
create function public.fcf_g1_readonly_projection(p_privacy_keys text[])returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 perform private_fcf_six_target_release.require(current_setting('transaction_read_only')='on','explicit readonly transaction required');
 return private_fcf_g1_readonly.capture('es-ct-segona-g1',p_privacy_keys);
end$$;
revoke all on function public.fcf_g1_readonly_projection(text[])from public,anon,authenticated;
grant execute on function public.fcf_g1_readonly_projection(text[])to service_role;
