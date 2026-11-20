-- The export's zip moves to the store, at `exports/<organization_id>/<id>.zip` (ADR 0074, ADR 0076). SQL
-- cannot write there, so a file still in the column is not moved: its export ends now, and the page says it
-- expired today. It is a copy at most 7 days old, which the owner asks for again with one click.
update organization_export set expires_at = least(expires_at, now()) where file is not null;
drop index organization_export_expires_at_idx;
alter table organization_export drop column file;
