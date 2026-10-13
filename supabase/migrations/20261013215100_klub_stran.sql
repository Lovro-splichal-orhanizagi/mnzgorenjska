-- Klubski računi, faza 2: stran kluba (spec, razdelek 4). Klubski račun
-- ureja opis in povezave ter naloži grb. Grb kluba ima prednost pred grbi iz
-- skript: sprožilec ohrani `logo_url`, dokler admin ne ponastavi vira.

create table public.klub_predstavitev (
  team_id       bigint primary key references public.teams on delete cascade,
  opis          text check (opis is null or (char_length(opis) between 1 and 300 and opis !~ '[[:cntrl:]]')),
  -- Gostitelj iz črk, številk, pik in vezajev: naslov, ki ga brskalnik ne
  -- razčleni (https://[x]), bi podrl stran kluba.
  spletna_stran text check (spletna_stran is null or (length(spletna_stran) <= 200
                and spletna_stran ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]<>"''\\]*)?$')),
  instagram     text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  facebook      text check (facebook is null or facebook ~ '^[A-Za-z0-9.]{5,50}$'),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles on delete set null
);
alter table public.klub_predstavitev enable row level security;
revoke all on public.klub_predstavitev from anon, authenticated;
grant select (team_id, opis, spletna_stran, instagram, facebook, updated_at) on public.klub_predstavitev to anon, authenticated;
create policy "predstavitev kluba je javna" on public.klub_predstavitev for select using (true);

create or replace function public.ima_klubski_racun(p_team_id bigint)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from klubski_racuni where team_id = p_team_id and preklican_at is null) $$;
grant execute on function public.ima_klubski_racun(bigint) to anon, authenticated;

create or replace function public.klub_uredi_predstavitev(p_team_id bigint, p_opis text, p_spletna_stran text,
                                                          p_instagram text, p_facebook text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  insert into klub_predstavitev(team_id, opis, spletna_stran, instagram, facebook, updated_at, updated_by)
  values (p_team_id, nullif(btrim(coalesce(p_opis, '')), ''), nullif(btrim(coalesce(p_spletna_stran, '')), ''),
          nullif(btrim(coalesce(p_instagram, '')), ''), nullif(btrim(coalesce(p_facebook, '')), ''), now(), auth.uid())
  on conflict (team_id) do update
    set opis = excluded.opis, spletna_stran = excluded.spletna_stran, instagram = excluded.instagram,
        facebook = excluded.facebook, updated_at = now(), updated_by = auth.uid();
end;
$$;

-- Grb: vir 'klub' zaklene logo_url pred skriptami (prenesi-grbe*, grbi-*,
-- zdruzi-klube). Spremeni ga le RPC spodaj (nastavi `slff.grb_kluba`).
alter table public.teams add column if not exists logo_vir text check (logo_vir is null or logo_vir = 'klub');

create or replace function public.trg_teams_grb_kluba()
returns trigger language plpgsql set search_path = public
as $$
begin
  if old.logo_vir = 'klub' and coalesce(current_setting('slff.grb_kluba', true), '') <> 'da' then
    new.logo_url := old.logo_url;
    new.logo_vir := old.logo_vir;
  end if;
  return new;
end;
$$;
drop trigger if exists teams_grb_kluba on public.teams;
create trigger teams_grb_kluba before update of logo_url, logo_vir on public.teams
  for each row execute function public.trg_teams_grb_kluba();

create or replace function public.klub_nastavi_grb(p_team_id bigint, p_pot text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_url text;
begin
  if auth.uid() is null or not je_klubski_racun(auth.uid(), p_team_id) then
    raise insufficient_privilege using message = 'Samo klubski račun tega kluba.';
  end if;
  if p_pot !~ ('^' || p_team_id::text || '/[A-Za-z0-9_-]{1,64}\.(webp|png)$') then
    raise insufficient_privilege using message = 'Grb mora biti v mapi svojega kluba.';
  end if;
  -- Relativna pot: vmesnik (naslovSlike) doda API_URL, kot pri fotografijah.
  v_url := '/storage/v1/object/public/grbi-klubov/' || p_pot;
  perform set_config('slff.grb_kluba', 'da', true);
  update teams set logo_url = v_url, logo_vir = 'klub' where id = p_team_id;
  perform set_config('slff.grb_kluba', '', true);
  return v_url;
end;
$$;

create or replace function public.admin_ponastavi_grb(p_team_id bigint)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise insufficient_privilege using message = 'Samo administrator.';
  end if;
  perform set_config('slff.grb_kluba', 'da', true);
  update teams set logo_vir = null where id = p_team_id;
  perform set_config('slff.grb_kluba', '', true);
end;
$$;

revoke all on function public.klub_uredi_predstavitev(bigint, text, text, text, text),
  public.klub_nastavi_grb(bigint, text), public.admin_ponastavi_grb(bigint) from public, anon;
grant execute on function public.klub_uredi_predstavitev(bigint, text, text, text, text),
  public.klub_nastavi_grb(bigint, text), public.admin_ponastavi_grb(bigint) to authenticated;

-- Vedro grbov: javno branje, pisanje le klubski račun v mapo svojega kluba.
create or replace function public.klub_sme_pisati_grb(p_name text)
returns boolean language sql stable security definer set search_path = public
as $$
  select case when p_name ~ '^-?[0-9]{1,18}/[A-Za-z0-9_-]{1,64}\.(webp|png)$'
              then je_klubski_racun(auth.uid(), split_part(p_name, '/', 1)::bigint)
              else false end
$$;
grant execute on function public.klub_sme_pisati_grb(text) to authenticated;

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Sheme storage ni: vedro grbov ni ustvarjeno.';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('grbi-klubov', 'grbi-klubov', true, 524288, array['image/webp', 'image/png'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
                                 allowed_mime_types = excluded.allowed_mime_types;
  drop policy if exists "grbi klubov: klub naloži" on storage.objects;
  drop policy if exists "grbi klubov: klub zamenja" on storage.objects;
  drop policy if exists "grbi klubov: klub bere" on storage.objects;
  create policy "grbi klubov: klub bere" on storage.objects for select to authenticated
    using (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
  create policy "grbi klubov: klub naloži" on storage.objects for insert to authenticated
    with check (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
  create policy "grbi klubov: klub zamenja" on storage.objects for update to authenticated
    using (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name))
    with check (bucket_id = 'grbi-klubov' and public.klub_sme_pisati_grb(name));
end;
$$;

-- Združevanje klubov (zdruzi-klube.mjs) izbriše odvečno vrstico teams; s tem
-- bi šli klubski računi in predstavitev (on delete cascade). Raje pade.
create or replace function public.trg_teams_ne_brisi_kluba_z_racunom()
returns trigger language plpgsql set search_path = public
as $$
begin
  if exists (select 1 from klubski_racuni where team_id = old.id and preklican_at is null) then
    raise exception 'Klub % ima klubski račun: pred brisanjem ga prenesi na drug klub.', old.id;
  end if;
  return old;
end;
$$;
drop trigger if exists teams_ne_brisi_kluba_z_racunom on public.teams;
create trigger teams_ne_brisi_kluba_z_racunom before delete on public.teams
  for each row execute function public.trg_teams_ne_brisi_kluba_z_racunom();
