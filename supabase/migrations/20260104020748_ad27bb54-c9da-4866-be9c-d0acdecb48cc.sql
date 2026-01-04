-- Add amenities column to salons table
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.salons.amenities IS 'Array of amenity names available at the salon';