-- Obiski strani: katero stran človek po registraciji sploh odpre.
--
-- Lijak začetka (20261006173100) šteje pot do prve ekipe, ne pove pa, kam
-- gredo tisti, ki je ne sestavijo. Od 1447 registriranih jih je bilo 4. 10.
-- 2026 brez ekipe 829, in to je dvoje različnih popravkov: če pridejo na
-- Mojo ekipo in odnehajo tam, je kriv obrazec; če do nje sploh ne pridejo,
-- je kriva pot do nje.
--
-- Kot `sponsor_stats` in `lijak_dnevno`: dnevni seštevki, ne dogodki. V
-- tabelo gre ime strani in starost računa — nikoli uporabnik, naprava ali
-- naslov. Starost izračuna baza iz `auth.users.created_at`: tako je točna,
-- odjemalec je ne more lagati, v tabeli pa o osebi kljub temu ni ničesar.

create table if not exists public.obiski_dnevno (
  dan date not null default current_date,
  stran text not null,
  skupina text not null,
  stevilo int not null default 0,
  primary key (dan, stran, skupina)
);

comment on table public.obiski_dnevno is
  'Dnevni seštevki obiskov po strani in starosti računa (nov = registriran v zadnjih 7 dneh). Brez uporabnika, naprave in naslova.';

alter table public.obiski_dnevno enable row level security;
-- Bere le admin; piše le funkcija spodaj.
create policy obiski_admin_bere on public.obiski_dnevno for select using (public.is_admin());

-- Nova stran pomeni novo ime tudi tu: imena, ki ga ne poznamo, ne zapišemo,
-- da se tabela ne napolni z izmišljenimi vrsticami.
create or replace function public.zabelezi_obisk(p_stran text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ustvarjen timestamptz;
  v_skupina text;
begin
  if p_stran not in (
    'domov', 'vstop_drzave', 'moja_ekipa', 'igralci', 'igralec', 'lestvica',
    'slovenija', 'mini_lige', 'vstop_v_mini_ligo', 'ekipa', 'klub', 'rezultati',
    'tekma', 'glasovanje', 'pozicije', 'odsotnosti', 'racun', 'opomniki',
    'pravno', 'prijava', 'potrditev'
  ) then
    return;
  end if;

  -- Neprijavljen nima vrstice; `auth.uid()` je takrat null.
  select created_at into v_ustvarjen from auth.users where id = auth.uid();

  v_skupina := case
    when v_ustvarjen is null then 'neprijavljen'
    when v_ustvarjen > now() - interval '7 days' then 'nov'
    else 'star'
  end;

  insert into obiski_dnevno (dan, stran, skupina, stevilo)
  values (current_date, p_stran, v_skupina, 1)
  on conflict (dan, stran, skupina) do update
    set stevilo = obiski_dnevno.stevilo + 1;
end;
$$;

revoke all on function public.zabelezi_obisk(text) from public;
grant execute on function public.zabelezi_obisk(text) to anon, authenticated;
