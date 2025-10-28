-- Function to update user location with PostGIS geography
-- This function properly formats the location as a PostGIS POINT
CREATE OR REPLACE FUNCTION update_user_location(
  user_id UUID,
  user_lng DOUBLE PRECISION,
  user_lat DOUBLE PRECISION
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET 
    location = ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    last_active = NOW(),
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

