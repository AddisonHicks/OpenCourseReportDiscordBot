# Enable Supabase Realtime for new report notifications.
# Run once in the Supabase SQL Editor (Dashboard → SQL).

alter publication supabase_realtime add table reports;
