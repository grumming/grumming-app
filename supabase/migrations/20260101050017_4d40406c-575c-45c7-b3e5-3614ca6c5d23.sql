-- Create a function to update salon rating and review count
CREATE OR REPLACE FUNCTION public.update_salon_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_salon_id UUID;
  new_rating NUMERIC;
  new_count INTEGER;
BEGIN
  -- Determine which salon_id to use (handle both UUID and slug/name formats)
  -- First try to find by UUID
  SELECT id INTO target_salon_id FROM salons WHERE id::text = COALESCE(NEW.salon_id, OLD.salon_id);
  
  -- If not found, try to find by name
  IF target_salon_id IS NULL THEN
    SELECT id INTO target_salon_id FROM salons WHERE name = COALESCE(NEW.salon_id, OLD.salon_id);
  END IF;
  
  -- If still not found, try lowercase name matching with hyphen-to-space conversion
  IF target_salon_id IS NULL THEN
    SELECT id INTO target_salon_id FROM salons 
    WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER(COALESCE(NEW.salon_id, OLD.salon_id))
       OR LOWER(name) = LOWER(REPLACE(COALESCE(NEW.salon_id, OLD.salon_id), '-', ' '));
  END IF;
  
  IF target_salon_id IS NOT NULL THEN
    -- Calculate new rating and count
    SELECT 
      COALESCE(ROUND(AVG(rating)::numeric, 1), 4.5),
      COUNT(*)
    INTO new_rating, new_count
    FROM reviews r
    WHERE r.salon_id = target_salon_id::text 
       OR r.salon_id = (SELECT name FROM salons WHERE id = target_salon_id)
       OR LOWER(REPLACE((SELECT name FROM salons WHERE id = target_salon_id), ' ', '-')) = LOWER(r.salon_id);
    
    -- Update the salon
    UPDATE salons
    SET rating = new_rating,
        total_reviews = new_count,
        updated_at = now()
    WHERE id = target_salon_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for insert, update, and delete on reviews
DROP TRIGGER IF EXISTS update_salon_stats_on_review ON public.reviews;
CREATE TRIGGER update_salon_stats_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_salon_review_stats();