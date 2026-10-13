-- Spletna potisna obvestila: brskalnik dobi žeton FCM kot aplikacija in ga
-- shrani s `shrani_push_zeton(žeton, 'web')`. Pošiljanje (posli-opomnik) je isto.
alter table push_tokens drop constraint push_tokens_platforma_check;
alter table push_tokens add constraint push_tokens_platforma_check
  check (platforma in ('ios', 'android', 'web'));
