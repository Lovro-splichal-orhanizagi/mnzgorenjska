-- CHECK expressions execute as the row writer, including ordinary non-NULL
-- score writes. Preserve importer and existing authenticated-admin DML without
-- exposing the private schema or any cleanup/mutation helper.
grant execute on function private_fcf_six_history.unknown_result_allowed(bigint,bigint,bigint,text,text,date,text,text,text,integer)
  to service_role, authenticated;
