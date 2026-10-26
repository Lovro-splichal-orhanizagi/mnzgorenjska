-- Extend only the exact observed legacy userid family. Opaque source strings,
-- SHA-256/52-bit keys, atomic collision handling and service-only ACLs remain.
alter table private_fussball.identity_map
  drop constraint identity_map_source_id_check;
alter table private_fussball.identity_map
  add constraint identity_map_source_id_check
  check (source_id ~ '^de-fussball-(player-id-[A-Z0-9]{32}|userid-([A-Z0-9]{32}|I\.[0-9]{6}\.-{23}))$');

create or replace function public.fussball_reserve_player_ids(p_source_ids text[])
returns table(source_id text, reg_st bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_id text;
  v_reg_st bigint;
  v_existing bigint;
begin
  if p_source_ids is null
     or pg_catalog.array_ndims(p_source_ids) is distinct from 1
     or pg_catalog.array_lower(p_source_ids, 1) is distinct from 1
     or pg_catalog.cardinality(p_source_ids) not between 1 and 5000
     or exists (
       select 1 from pg_catalog.unnest(p_source_ids) as s(id)
       where s.id is null
          or s.id collate "C" !~ '^de-fussball-(player-id-[A-Z0-9]{32}|userid-([A-Z0-9]{32}|I\.[0-9]{6}\.-{23}))$'
     )
     or (select pg_catalog.count(distinct s.id collate "C")
         from pg_catalog.unnest(p_source_ids) as s(id)) <> pg_catalog.cardinality(p_source_ids)
  then
    raise exception using errcode = '22023',
      message = 'FUSSBALL_IDENTITIES: expected 1 to 5000 distinct exact source IDs in a one-dimensional, one-based array';
  end if;

  -- Stable lock order reduces overlapping reservation deadlocks. A unique
  -- numeric-key collision deliberately propagates, rolling back the whole RPC.
  for v_source_id in
    select s.id from pg_catalog.unnest(p_source_ids) as s(id)
    order by s.id collate "C"
  loop
    v_reg_st := 4503599627370496 + (
      'x' || pg_catalog.substr(pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(v_source_id, 'UTF8')), 'hex'
      ), 1, 13)
    )::bit(52)::bigint;

    insert into private_fussball.identity_map as im(source_id, reg_st)
    values (v_source_id, v_reg_st)
    on conflict on constraint identity_map_pkey do nothing;

    select im.reg_st into v_existing
    from private_fussball.identity_map as im
    where im.source_id = v_source_id;
    if v_existing is distinct from v_reg_st then
      raise exception using errcode = '23514',
        message = 'FUSSBALL_IDENTITIES: existing identity disagrees with its deterministic internal key';
    end if;

    source_id := v_source_id;
    reg_st := v_reg_st;
    return next;
  end loop;
end;
$$;

revoke all on function public.fussball_reserve_player_ids(text[])
  from public, anon, authenticated, service_role;
grant execute on function public.fussball_reserve_player_ids(text[]) to service_role;

comment on table private_fussball.identity_map is
  'Exact FUSSBALL public profile namespaces mapped to internal SHA-256/52-bit SLFF keys; not DFB registration numbers. No name-based aliases.';
comment on function public.fussball_reserve_player_ids(text[]) is
  'Service-only atomic reservation of exact FUSSBALL public source IDs; numeric collisions or changed mappings abort the complete batch.';
