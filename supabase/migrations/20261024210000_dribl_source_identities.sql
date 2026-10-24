-- Public Dribl user_hash_id belongs to a tenant namespace and is different
-- from event member_id. Numeric keys are internal SLFF keys, never official
-- player registration numbers. Only the observed ten-character ID format is admitted.
create schema private_dribl;
revoke all on schema private_dribl from public, anon, authenticated, service_role;

create table private_dribl.identity_map (
  source_id text collate "C" primary key
    check (source_id ~ '^dribl:[A-Za-z0-9]{10}:user:[A-Za-z0-9]{10}$'),
  reg_st bigint not null unique
    check (reg_st between 4503599627370496 and 9007199254740991)
);
alter table private_dribl.identity_map enable row level security;
revoke all on private_dribl.identity_map from public, anon, authenticated, service_role;

create function public.dribl_reserve_player_ids(p_source_ids text[])
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
          or s.id collate "C" !~ '^dribl:[A-Za-z0-9]{10}:user:[A-Za-z0-9]{10}$'
     )
     or (select pg_catalog.count(distinct s.id collate "C")
         from pg_catalog.unnest(p_source_ids) as s(id)) <> pg_catalog.cardinality(p_source_ids)
  then
    raise exception using errcode = '22023',
      message = 'DRIBL_IDENTITIES: expected 1 to 5000 distinct exact source IDs in a one-dimensional, one-based array';
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

    insert into private_dribl.identity_map as im(source_id, reg_st)
    values (v_source_id, v_reg_st)
    on conflict on constraint identity_map_pkey do nothing;

    select im.reg_st into v_existing
    from private_dribl.identity_map as im
    where im.source_id = v_source_id;
    if v_existing is distinct from v_reg_st then
      raise exception using errcode = '23514',
        message = 'DRIBL_IDENTITIES: existing identity disagrees with its deterministic internal key';
    end if;

    source_id := v_source_id;
    reg_st := v_reg_st;
    return next;
  end loop;
end;
$$;

revoke all on function public.dribl_reserve_player_ids(text[])
  from public, anon, authenticated, service_role;
grant execute on function public.dribl_reserve_player_ids(text[]) to service_role;

comment on table private_dribl.identity_map is
  'Exact Dribl tenant/profile namespaces mapped to internal SHA-256/52-bit SLFF keys; not official player registration numbers. No name-based aliases.';
comment on function public.dribl_reserve_player_ids(text[]) is
  'Service-only atomic reservation of exact Dribl tenant-scoped public profile IDs; numeric collisions or changed mappings abort the complete batch.';
