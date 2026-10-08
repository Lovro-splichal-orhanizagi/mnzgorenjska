-- Stiki s klubi za Claude (in skripte): branje in beleženje brez admin prijave.
--
-- Klubom pišemo trije, vsak s svojim Claudom. Da se ne podvajamo, mora vsak
-- PRED mailom preveriti, ali je klub že dobil pošto, in PO mailu poslano
-- zabeležiti (scripts/stiki-klubov.mjs, pravilo v CLAUDE.md). Servisnega
-- ključa nimajo vsi in je preširok; zato ozek ključ: funkcije spodaj
-- delujejo le s pravim `p_kljuc` in se dotikajo le tabel stikov.
--
-- Ključ je v `stiki_kljuc` (vidi ga le baza). Admin ga prebere prek ssh in ga
-- da sodelavcem (okolje SLFF_STIKI_KLJUC); repo je javen, zato ne v git.

create table public.stiki_kljuc (
  id int primary key default 1 check (id = 1),
  kljuc text not null
);
alter table public.stiki_kljuc enable row level security;
revoke all on public.stiki_kljuc from public, anon, authenticated;
insert into public.stiki_kljuc (kljuc) values (encode(extensions.gen_random_bytes(24), 'hex'));

create function public.stiki_preveri_kljuc(p_kljuc text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_kljuc is null or p_kljuc <> (select kljuc from stiki_kljuc) then
    raise exception 'Napačen ključ za stike.' using errcode = '28000';
  end if;
end $$;
revoke all on function public.stiki_preveri_kljuc(text) from public, anon, authenticated;

-- Iskanje: po delu imena kluba, naslovu, ligi ali team_id; filtri po državi in
-- stanju. Vrne naslove s stanjem in zadnjimi maili (brez besedil, razen
-- `z_besedilom`).
create function public.stiki_klubov(
  p_kljuc text,
  p_iskanje text default null,
  p_drzava text default null,
  p_stanje text default null,
  p_team_id bigint default null,
  p_z_besedilom boolean default false,
  p_omejitev int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  perform stiki_preveri_kljuc(p_kljuc);
  select coalesce(jsonb_agg(x order by x->>'drzava', x->>'klub'), '[]') into v
    from (
      select jsonb_build_object(
               'id', s.id, 'klub', s.klub, 'drzava', s.drzava, 'liga', s.liga_slug, 'team_id', s.team_id,
               'email', s.email, 'kontakt', s.kontakt, 'stanje', s.stanje, 'odgovorni', s.odgovorni,
               'opomba', s.opomba, 'mailov', s.mailov, 'zadnji_mail', s.zadnji_mail_at,
               'maili', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'kdaj', p.poslano_at, 'vrsta', p.vrsta, 'poslal', p.poslal, 'zadeva', p.zadeva,
                          'opomba', p.opomba)
                          || case when p_z_besedilom then jsonb_build_object('telo', p.telo) else '{}' end
                          order by p.poslano_at desc), '[]')
                   from klub_stik_posta p where p.stik_id = s.id)
             ) x
        from klub_stik s
       where (p_drzava is null or s.drzava = p_drzava)
         and (p_stanje is null or s.stanje = p_stanje)
         and (p_team_id is null or s.team_id = p_team_id)
         and (p_iskanje is null
              or s.klub ilike '%' || p_iskanje || '%'
              or s.email ilike '%' || p_iskanje || '%'
              or s.liga_slug ilike '%' || p_iskanje || '%')
       order by s.drzava, s.klub
       limit least(greatest(coalesce(p_omejitev, 200), 1), 2000)
    ) t;
  return v;
end $$;

-- Zabeleži mail (ali odgovor, klic). Naslov, ki ga še ni, doda kot nov stik
-- (zato klub in država). Vrne stanje stika po vpisu.
create function public.stiki_zabelezi(
  p_kljuc text,
  p_email text,
  p_vrsta text,
  p_poslal text,
  p_zadeva text default null,
  p_telo text default null,
  p_klub text default null,
  p_drzava text default null,
  p_liga text default null,
  p_team_id bigint default null,
  p_opomba text default null,
  p_gmail_nit text default null,
  p_kdaj timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_email text := lower(trim(p_email));
begin
  perform stiki_preveri_kljuc(p_kljuc);
  if coalesce(v_email, '') = '' then raise exception 'Manjka e-naslov.'; end if;
  if coalesce(trim(p_poslal), '') = '' then raise exception 'Manjka, kdo je poslal (p_poslal).'; end if;
  select id into v_id from klub_stik where lower(email) = v_email;
  if v_id is null then
    if p_klub is null or p_drzava is null then
      raise exception 'Naslova % ni med stiki; za nov stik podaj p_klub in p_drzava.', v_email;
    end if;
    insert into klub_stik (klub, drzava, liga_slug, team_id, email)
    values (p_klub, p_drzava, p_liga, p_team_id, v_email)
    returning id into v_id;
  end if;
  insert into klub_stik_posta (stik_id, vrsta, poslano_at, poslal, za, zadeva, telo, opomba, gmail_nit)
  values (v_id, p_vrsta, coalesce(p_kdaj, now()), p_poslal, v_email, p_zadeva, p_telo, p_opomba, p_gmail_nit);
  return (select jsonb_build_object('id', s.id, 'klub', s.klub, 'email', s.email, 'stanje', s.stanje, 'mailov', s.mailov)
            from klub_stik s where s.id = v_id);
end $$;

-- Ročno stanje, odgovorni, opomba (npr. "sodeluje", "ne_zeli").
create function public.stiki_nastavi(
  p_kljuc text,
  p_email text,
  p_stanje text default null,
  p_odgovorni text default null,
  p_opomba text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform stiki_preveri_kljuc(p_kljuc);
  update klub_stik
     set stanje = coalesce(p_stanje, stanje),
         odgovorni = coalesce(p_odgovorni, odgovorni),
         opomba = coalesce(p_opomba, opomba)
   where lower(email) = lower(trim(p_email))
  returning id into v_id;
  if v_id is null then raise exception 'Naslova % ni med stiki.', p_email; end if;
  return (select jsonb_build_object('id', id, 'klub', klub, 'email', email, 'stanje', stanje) from klub_stik where id = v_id);
end $$;

revoke all on function public.stiki_klubov(text, text, text, text, bigint, boolean, int) from public;
revoke all on function public.stiki_zabelezi(text, text, text, text, text, text, text, text, text, bigint, text, text, timestamptz) from public;
revoke all on function public.stiki_nastavi(text, text, text, text, text) from public;
grant execute on function public.stiki_klubov(text, text, text, text, bigint, boolean, int) to anon, authenticated;
grant execute on function public.stiki_zabelezi(text, text, text, text, text, text, text, text, text, bigint, text, text, timestamptz) to anon, authenticated;
grant execute on function public.stiki_nastavi(text, text, text, text, text) to anon, authenticated;
