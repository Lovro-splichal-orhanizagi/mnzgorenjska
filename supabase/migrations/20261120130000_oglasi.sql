-- Oglasi Google AdSense na sponzorskih mestih (domov, lestvica, moja_ekipa,
-- rezultati, igralci), le kjer ni sponzorja.
--
-- Stikalo `oglasi`: 0 izklop (privzeto), 1 le admin, 2 vsi. Povoz po
-- tekmovanju v `competition_settings` lahko ligo izklopi.
-- `oglasi_client` je založnik ('ca-pub-…'), `oglasi_mesta` id-ji enot po mestu
-- ({"domov": "1234567890", …}). Dokler je stikalo 0 ali mest ni, vmesnik ne naloži
-- Googlove skripte: brez tujih zahtevkov.
--
-- Oglasov nikoli ni v mladinski ligi in za plačnike (aktiven SLFF Pro ali
-- preverjen profil). Odloči ta funkcija; vmesnik le prikaže.
insert into settings (key, value) values
  ('oglasi', '0'::jsonb),
  ('oglasi_client', '"ca-pub-9235394594566763"'::jsonb),
  ('oglasi_mesta', '{}'::jsonb)
on conflict (key) do nothing;

create or replace function public.oglasi_za(p_competition_id bigint)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('client', s.client, 'mesta', s.mesta)
    from (select coalesce((select value #>> '{}' from settings where key = 'oglasi_client'), '') as client,
                 coalesce((select value from settings where key = 'oglasi_mesta' and jsonb_typeof(value) = 'object'), '{}') as mesta) s
   where case coalesce(nastavitev_int_za('oglasi', p_competition_id, 0), 0)
           when 2 then true
           when 1 then is_admin()
           else false
         end
     and s.client ~ '^ca-pub-[0-9]{10,20}$'
     and s.mesta <> '{}'::jsonb
     and exists (select 1 from competitions where id = p_competition_id)
     and not je_mladinska_liga(p_competition_id)
     and not pro_aktiven(auth.uid())
     and not exists (select 1 from preverjeni_racuni r
                      where r.user_id = auth.uid() and r.status = 'aktiven'
                        and (r.velja_do is null or r.velja_do > now()))
$$;
comment on function public.oglasi_za(bigint) is
  'Založnik in enote AdSense za ligo, ali NULL (stikalo oglasi, prazen id, mladinska liga, plačnik).';
revoke all on function public.oglasi_za(bigint) from public;
grant execute on function public.oglasi_za(bigint) to anon, authenticated;
