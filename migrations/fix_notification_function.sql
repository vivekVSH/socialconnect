-- Fix the get_user_notifications function to match actual table column types
CREATE OR REPLACE FUNCTION get_user_notifications(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  actor_id UUID,
  type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  actor_username TEXT,
  actor_avatar_url TEXT,
  actor_first_name TEXT,
  actor_last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.actor_id,
    n.type,
    n.entity_type,
    n.entity_id,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    p.username as actor_username,
    p.avatar_url as actor_avatar_url,
    p.first_name as actor_first_name,
    p.last_name as actor_last_name
  FROM notifications n
  LEFT JOIN profiles p ON n.actor_id = p.id
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
