-- SLFF Scout, faza 3a: plačila (Stripe, prodajalec SPACE GUARDIAN d.o.o.).
--
-- scout-placilo (JWT kupca) pripravi Checkout (scout_pripravi_nakup) in portal
-- (scout_portal_kupec); stripe-webhook (metadata.app = slff-scout, servisni
-- ključ) zapiše plačilo, obnovo in konec. Preklic mora biti vedno mogoč:
-- portal dobi plačnik ali katerikoli uradni račun kluba, ne glede na sedež.

create function public.scout_pripravi_nakup(p_obdobje text)
returns table (team_id bigint, stripe_customer_id text, email text)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n scout.narocnine;
begin
  select x.* into n from scout.sedezi s join scout.narocnine x on x.team_id = s.team_id where s.user_id = v_uid;
  if not found or not je_klubski_racun(v_uid, n.team_id) or n.zaprt_at is not null then
    raise insufficient_privilege using message = 'Scout: ni sedeža kluba.';
  end if;
  if p_obdobje is null or p_obdobje not in ('mesec', 'sezona') then
    raise exception 'Scout: obdobje je mesec ali sezona.' using hint = 'scout-filter';
  end if;
  if n.paket = 'klub' and n.velja_do > now() then
    raise exception 'Scout: naročnina že teče.' using hint = 'scout-ze-placano';
  end if;
  if coalesce((select d.stanje from scout.drzave d where d.country_id = n.country_id), 'zaprto') = 'zaprto' then
    raise exception 'Scout: država ni odprta.' using hint = 'scout-drzava';
  end if;
  return query select n.team_id, n.stripe_customer_id, (select u.email::text from auth.users u where u.id = v_uid);
end;
$$;

create function public.scout_portal_kupec()
returns text language sql stable security definer set search_path = public
as $$
  select n.stripe_customer_id from scout.narocnine n
   where n.stripe_customer_id is not null
     and (n.placal = auth.uid() or je_klubski_racun(auth.uid(), n.team_id))
   order by n.updated_at desc
   limit 1
$$;

create function public.scout_iz_placila(p_team_id bigint, p_user_id uuid, p_obdobje text, p_velja_do timestamptz,
                                        p_customer text, p_subscription text)
returns text language plpgsql security definer set search_path = public
as $$
declare
  n scout.narocnine;
  v_stara text;
begin
  select * into n from scout.narocnine where team_id = p_team_id for update;
  if not found then
    return 'ni_narocnine';
  end if;
  if n.stripe_subscription_id = p_subscription then
    return 'aktivna';  -- ponovljen dogodek
  end if;
  if n.zaprt_at is not null then
    return 'zaprt';
  end if;
  if n.paket = 'klub' and n.velja_do > now() then
    return 'dvojno';
  end if;
  if p_obdobje is null or p_obdobje not in ('mesec', 'sezona') then
    return 'neveljavno';
  end if;
  -- Prejšnja naročnina (potekla, morda še past_due) se ne sme zaračunavati naprej.
  v_stara := n.stripe_subscription_id;
  update scout.narocnine
     set paket = 'klub', obdobje = p_obdobje, velja_do = p_velja_do, stripe_customer_id = p_customer,
         stripe_subscription_id = p_subscription, placal = p_user_id, updated_at = now()
   where team_id = p_team_id;
  perform preverjeni_na_discord(format('💶 Scout plačan: %s (%s)', (select name from teams where id = p_team_id), p_obdobje));
  return case when v_stara is null then 'aktivna' else 'aktivna:' || v_stara end;
end;
$$;

-- invoice.paid lahko pride pred checkout.session.completed: neznana naročnina
-- je 'neznana' (webhook ne naredi nič), ne preklic.
create function public.scout_podaljsaj(p_subscription text, p_velja_do timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update scout.narocnine set velja_do = greatest(velja_do, p_velja_do), updated_at = now()
   where stripe_subscription_id = p_subscription and zaprt_at is null;
  if found then
    return 'podaljsano';
  end if;
  if exists (select 1 from scout.narocnine where stripe_subscription_id = p_subscription) then
    return 'zaprt';
  end if;
  return 'neznana';
end;
$$;

create function public.scout_narocnina_konec(p_subscription text, p_konec timestamptz)
returns text language plpgsql security definer set search_path = public
as $$
begin
  update scout.narocnine set velja_do = least(velja_do, p_konec), updated_at = now()
   where stripe_subscription_id = p_subscription;
  return case when found then 'koncano' else 'neznana' end;
end;
$$;

revoke all on function public.scout_pripravi_nakup(text), public.scout_portal_kupec() from public, anon;
grant execute on function public.scout_pripravi_nakup(text), public.scout_portal_kupec() to authenticated;
revoke all on function public.scout_iz_placila(bigint, uuid, text, timestamptz, text, text),
  public.scout_podaljsaj(text, timestamptz), public.scout_narocnina_konec(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.scout_iz_placila(bigint, uuid, text, timestamptz, text, text),
  public.scout_podaljsaj(text, timestamptz), public.scout_narocnina_konec(text, timestamptz) to service_role;
