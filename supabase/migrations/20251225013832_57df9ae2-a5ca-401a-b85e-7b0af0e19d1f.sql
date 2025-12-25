-- Create stylists table with full professional profile
CREATE TABLE public.stylists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stylists ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (stylists are viewable by everyone)
CREATE POLICY "Anyone can view stylists"
ON public.stylists
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stylists_updated_at
BEFORE UPDATE ON public.stylists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample stylists data
INSERT INTO public.stylists (salon_id, name, photo_url, bio, specialties, experience_years, rating, total_reviews, is_available)
VALUES 
  ('1', 'Priya Sharma', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', 'Expert in bridal and party makeup with 8 years of experience.', ARRAY['Bridal Makeup', 'Hair Styling', 'Facial'], 8, 4.9, 124, true),
  ('1', 'Rahul Verma', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', 'Specialist in men''s grooming and modern haircuts.', ARRAY['Haircut', 'Beard Styling', 'Hair Color'], 5, 4.7, 89, true),
  ('1', 'Sneha Patel', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200', 'Nail art specialist with creative designs.', ARRAY['Nail Art', 'Manicure', 'Pedicure'], 4, 4.8, 67, true),
  ('2', 'Amit Kumar', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', 'Award-winning hair stylist specializing in color treatments.', ARRAY['Hair Color', 'Highlights', 'Balayage'], 10, 4.9, 156, true),
  ('2', 'Kavita Reddy', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200', 'Skincare expert with advanced facial techniques.', ARRAY['Facial', 'Skin Treatment', 'Threading'], 6, 4.6, 92, true),
  ('3', 'Vikram Singh', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', 'Celebrity stylist with expertise in trendy cuts.', ARRAY['Haircut', 'Hair Styling', 'Hair Spa'], 12, 5.0, 203, true);