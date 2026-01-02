-- Add latitude and longitude columns to salons table for distance-based sorting
ALTER TABLE public.salons 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create an index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_salons_coordinates ON public.salons(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;