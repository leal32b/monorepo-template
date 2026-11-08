-- Limits the database keeps for every new session of this role in this database (ADR 0047), so a
-- statement stuck on a lock, or a transaction left open, frees its connection instead of holding it.
-- Set on the role, not per connection, because a pooler in transaction mode would not keep a session
-- SET. The API's own deadline per statement (15 s) comes after the database's, which says why.
do $$
begin
  execute format('alter role current_user in database %I set statement_timeout = %L', current_database(), '10s');
  execute format(
    'alter role current_user in database %I set idle_in_transaction_session_timeout = %L',
    current_database(),
    '30s'
  );
end
$$;
