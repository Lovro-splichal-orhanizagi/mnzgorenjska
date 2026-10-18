-- Nemcija je ze igralna; tudi skupni stiki morajo sprejeti njene klube.
-- Ohranimo vse doslej dovoljene drzave iz 20261016213700.
alter table public.klub_stik drop constraint klub_stik_drzava_check;
alter table public.klub_stik
  add constraint klub_stik_drzava_check check (drzava in (
    'SI', 'SK', 'HR', 'CZ', 'HU', 'AT', 'RS', 'RO', 'EE', 'PL', 'ES', 'LV', 'MK',
    'GR', 'TR', 'UA', 'AM', 'AZ', 'DK', 'GB', 'MT', 'ME', 'BA', 'MD', 'DE'
  ));
