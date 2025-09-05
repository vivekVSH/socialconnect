-- Function to increment like count
create or replace function increment_like_count(post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update posts
  set like_count = like_count + 1
  where id = post_id;
end;
$$;

-- Function to decrement like count
create or replace function decrement_like_count(post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update posts
  set like_count = greatest(like_count - 1, 0)
  where id = post_id;
end;
$$;
