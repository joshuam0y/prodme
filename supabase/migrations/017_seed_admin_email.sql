insert into public.admin_emails (email)
values ('prodlinkapp@gmail.com')
on conflict (email) do nothing;
