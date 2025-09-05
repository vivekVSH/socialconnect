-- SocialConnect schema (no RLS policies required)
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  username text unique not null check (char_length(username) between 3 and 30 and username ~ '^[A-Za-z0-9_]+$'),
  first_name text,
  last_name text,
  bio text,
  avatar_url text,
  website text,
  location text,
  role text not null default 'user', -- 'user' | 'admin'
  is_active boolean not null default true,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(content) <= 280),
  author_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  category text not null default 'general' check (category in ('general','announcement','question')),
  is_active boolean not null default true,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FOLLOWS
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- LIKES
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- COMMENTS
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(content) <= 200),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in ('follow','like','comment')),
  post_id uuid references public.posts(id),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- VIEWS for convenience
create or replace view public.profiles_public as
select id, username, first_name, last_name, bio, avatar_url, website, location,
       role, is_active, followers_count, following_count, posts_count, created_at
from public.profiles;

create or replace view public.posts_enriched as
select p.*, pr.username as author_username
from public.posts p
join public.profiles pr on pr.id = p.author_id;

-- TRIGGERS to update counts

create or replace function public.update_posts_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update profiles set posts_count = posts_count - 1 where id = old.author_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists posts_count_trg on public.posts;
create trigger posts_count_trg
after insert or delete on public.posts
for each row execute function public.update_posts_count();

create or replace function public.update_follow_counts() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = new.following_id;
    update profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update profiles set followers_count = followers_count - 1 where id = old.following_id;
    update profiles set following_count = following_count - 1 where id = old.follower_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists follow_counts_trg on public.follows;
create trigger follow_counts_trg
after insert or delete on public.follows
for each row execute function public.update_follow_counts();

create or replace function public.update_like_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set like_count = like_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists like_count_trg on public.likes;
create trigger like_count_trg
after insert or delete on public.likes
for each row execute function public.update_like_count();

create or replace function public.update_comment_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comment_count = comment_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists comment_count_trg on public.comments;
create trigger comment_count_trg
after insert or delete on public.comments
for each row execute function public.update_comment_count();

-- Notifications helpers
create or replace function public.notify_follow() returns trigger as $$
begin
  insert into notifications(recipient_id, sender_id, notification_type, message)
  values (new.following_id, new.follower_id, 'follow', 'started following you');
  return new;
end;
$$ language plpgsql;

drop trigger if exists notif_follow_trg on public.follows;
create trigger notif_follow_trg
after insert on public.follows
for each row execute function public.notify_follow();

create or replace function public.notify_like() returns trigger as $$
declare author uuid;
begin
  select author_id into author from posts where id = new.post_id;
  if author is not null and author <> new.user_id then
    insert into notifications(recipient_id, sender_id, notification_type, post_id, message)
    values (author, new.user_id, 'like', new.post_id, 'liked your post');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists notif_like_trg on public.likes;
create trigger notif_like_trg
after insert on public.likes
for each row execute function public.notify_like();

create or replace function public.notify_comment() returns trigger as $$
declare author uuid;
begin
  select author_id into author from posts where id = new.post_id;
  if author is not null and author <> new.author_id then
    insert into notifications(recipient_id, sender_id, notification_type, post_id, message)
    values (author, new.author_id, 'comment', new.post_id, 'commented on your post');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists notif_comment_trg on public.comments;
create trigger notif_comment_trg
after insert on public.comments
for each row execute function public.notify_comment();

-- Admin stats RPC
create or replace function public.admin_stats() returns json language plpgsql as $$
declare res json;
begin
  select json_build_object(
    'total_users', (select count(*) from profiles),
    'total_posts', (select count(*) from posts),
    'active_today', (select count(*) from profiles where created_at >= now() - interval '1 day')
  ) into res;
  return res;
end $$;
