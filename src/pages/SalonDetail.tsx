import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Heart, Share2, 
  ChevronRight, Calendar, Check, User, MessageSquare, CreditCard, Gift, X,
  Tag, Loader2, Wallet, Ticket, Navigation, Car
} from 'lucide-react';
import BackToTop from '@/components/BackToTop';
import { useLocation } from '@/contexts/LocationContext';
import { calculateDistance, formatDistance, estimateTravelTime } from '@/lib/distance';
import { PaymentMethodSelector, PaymentMethodType } from '@/components/PaymentMethodSelector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useUpiPayment, getUpiAppName, isMobileDevice } from '@/hooks/useUpiPayment';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { SalonReviews } from '@/components/SalonReviews';
import StylistsList from '@/components/StylistsList';
import { useReferral } from '@/hooks/useReferral';
import { useWallet } from '@/hooks/useWallet';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { allSalonsList } from '@/data/salonsData';
import { useSalonById } from '@/hooks/useSalons';

// Mock salon data - in production this would come from database
const salonsData: Record<string, any> = {
  '1': {
    id: 1,
    name: "Luxe Beauty Lounge",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.9,
    reviews: 324,
    location: "Bandra West, Mumbai",
    address: "123 Linking Road, Bandra West, Mumbai 400050",
    coordinates: { lat: 19.0596, lng: 72.8295 },
    timing: "10 AM - 9 PM",
    phone: "+91 98765 43210",
    description: "Luxe Beauty Lounge is a premium salon offering world-class hair, makeup, and spa services. Our expert stylists use only the finest products to ensure you leave looking and feeling your best.",
    services: [
      { id: 1, name: "Haircut & Styling", duration: "45 min", price: 49, category: "Hair" },
      { id: 2, name: "Hair Coloring", duration: "2 hrs", price: 49, category: "Hair" },
      { id: 3, name: "Keratin Treatment", duration: "3 hrs", price: 49, category: "Hair" },
      { id: 4, name: "Bridal Makeup", duration: "2 hrs", price: 49, category: "Makeup" },
      { id: 5, name: "Party Makeup", duration: "1 hr", price: 49, category: "Makeup" },
      { id: 6, name: "Full Body Massage", duration: "1.5 hrs", price: 49, category: "Spa" },
      { id: 7, name: "Facial Treatment", duration: "1 hr", price: 49, category: "Spa" },
      { id: 8, name: "Manicure & Pedicure", duration: "1.5 hrs", price: 49, category: "Nails" },
    ],
    amenities: ["AC", "WiFi", "Parking", "Card Payment", "Wheelchair Accessible"],
    reviewsList: [
      { id: 1, name: "Priya Sharma", avatar: null, rating: 5, date: "2024-01-15", comment: "Amazing experience! The staff was so professional and my hair looks incredible." },
      { id: 2, name: "Ananya Patel", avatar: null, rating: 5, date: "2024-01-10", comment: "Best salon in Bandra! I always leave feeling like a queen. Highly recommend the keratin treatment." },
      { id: 3, name: "Meera Gupta", avatar: null, rating: 4, date: "2024-01-05", comment: "Great service and ambiance. A bit pricey but worth it for special occasions." },
    ],
  },
  '2': {
    id: 2,
    name: "Glow Studio",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.8,
    reviews: 256,
    location: "Andheri East, Mumbai",
    address: "456 Western Express Highway, Andheri East, Mumbai 400069",
    coordinates: { lat: 19.1136, lng: 72.8697 },
    timing: "9 AM - 8 PM",
    phone: "+91 98765 43211",
    description: "Glow Studio specializes in skincare and facial treatments. Our trained aestheticians provide personalized care using premium skincare products.",
    services: [
      { id: 1, name: "Classic Facial", duration: "1 hr", price: 49, category: "Skincare" },
      { id: 2, name: "Gold Facial", duration: "1.5 hrs", price: 49, category: "Skincare" },
      { id: 3, name: "Chemical Peel", duration: "45 min", price: 49, category: "Skincare" },
      { id: 4, name: "Full Body Waxing", duration: "1.5 hrs", price: 49, category: "Waxing" },
      { id: 5, name: "Threading", duration: "15 min", price: 49, category: "Threading" },
    ],
    amenities: ["AC", "WiFi", "Card Payment"],
    reviewsList: [
      { id: 1, name: "Sakshi Jain", avatar: null, rating: 5, date: "2024-01-12", comment: "My skin has never looked better! The gold facial is a must-try." },
      { id: 2, name: "Riya Verma", avatar: null, rating: 4, date: "2024-01-08", comment: "Good service and reasonable prices. Would recommend." },
    ],
  },
  '3': {
    id: 3,
    name: "The Hair Bar",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.7,
    reviews: 189,
    location: "Juhu, Mumbai",
    address: "789 Juhu Tara Road, Juhu, Mumbai 400049",
    coordinates: { lat: 19.1075, lng: 72.8263 },
    timing: "11 AM - 10 PM",
    phone: "+91 98765 43212",
    description: "The Hair Bar is your destination for trendy haircuts and vibrant colors. Our stylists stay updated with the latest trends to give you the perfect look.",
    services: [
      { id: 1, name: "Men's Haircut", duration: "30 min", price: 49, category: "Haircut" },
      { id: 2, name: "Women's Haircut", duration: "45 min", price: 49, category: "Haircut" },
      { id: 3, name: "Balayage", duration: "3 hrs", price: 49, category: "Color" },
      { id: 4, name: "Highlights", duration: "2 hrs", price: 49, category: "Color" },
      { id: 5, name: "Hair Spa", duration: "1 hr", price: 49, category: "Treatment" },
    ],
    amenities: ["AC", "WiFi", "Parking", "Card Payment"],
    reviewsList: [
      { id: 1, name: "Neha Kapoor", avatar: null, rating: 5, date: "2024-01-14", comment: "Got the best balayage here! Everyone keeps complimenting my hair." },
    ],
  },
  '4': {
    id: 4,
    name: "Serenity Spa",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.9,
    reviews: 412,
    location: "Powai, Mumbai",
    address: "321 Hiranandani Gardens, Powai, Mumbai 400076",
    coordinates: { lat: 19.1176, lng: 72.9060 },
    timing: "8 AM - 10 PM",
    phone: "+91 98765 43213",
    description: "Serenity Spa offers a tranquil escape from the city chaos. Indulge in our signature massages and body treatments for complete relaxation.",
    services: [
      { id: 1, name: "Swedish Massage", duration: "1 hr", price: 49, category: "Massage" },
      { id: 2, name: "Deep Tissue Massage", duration: "1 hr", price: 49, category: "Massage" },
      { id: 3, name: "Hot Stone Therapy", duration: "1.5 hrs", price: 49, category: "Massage" },
      { id: 4, name: "Body Wrap", duration: "1 hr", price: 49, category: "Body" },
      { id: 5, name: "Aromatherapy", duration: "1.5 hrs", price: 49, category: "Aromatherapy" },
    ],
    amenities: ["AC", "WiFi", "Parking", "Card Payment", "Locker Room", "Steam Room"],
    reviewsList: [
      { id: 1, name: "Kavya Singh", avatar: null, rating: 5, date: "2024-01-16", comment: "The hot stone therapy was heavenly! Best spa experience in Mumbai." },
      { id: 2, name: "Aisha Khan", avatar: null, rating: 5, date: "2024-01-11", comment: "Absolutely divine! The ambiance is so peaceful and the therapists are experts." },
      { id: 3, name: "Pooja Reddy", avatar: null, rating: 4, date: "2024-01-06", comment: "Great spa with professional staff. The steam room is a nice touch." },
    ],
  },
  // Bihar - Patna Salons
  '5': {
    id: 5,
    name: "Royal Cuts Salon",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.7,
    reviews: 289,
    location: "Boring Road, Patna",
    address: "Near Maurya Lok Complex, Boring Road, Patna, Bihar 800001",
    coordinates: { lat: 25.6093, lng: 85.1376 },
    timing: "10 AM - 9 PM",
    phone: "+91 98520 12345",
    description: "Royal Cuts is Patna's premier unisex salon offering the latest hairstyles, grooming services, and beauty treatments. Our skilled stylists bring international trends to Bihar.",
    services: [
      { id: 1, name: "Men's Haircut", duration: "30 min", price: 150, category: "Haircut" },
      { id: 2, name: "Women's Haircut", duration: "45 min", price: 250, category: "Haircut" },
      { id: 3, name: "Hair Coloring", duration: "2 hrs", price: 800, category: "Hair" },
      { id: 4, name: "Beard Styling", duration: "20 min", price: 100, category: "Grooming" },
      { id: 5, name: "Hair Spa", duration: "1 hr", price: 500, category: "Treatment" },
      { id: 6, name: "Facial", duration: "45 min", price: 400, category: "Skincare" },
      { id: 7, name: "Head Massage", duration: "30 min", price: 200, category: "Massage" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Parking"],
    reviewsList: [
      { id: 1, name: "Rahul Kumar", avatar: null, rating: 5, date: "2024-01-18", comment: "Best salon in Patna! The haircut was perfect and staff is very professional." },
      { id: 2, name: "Sneha Singh", avatar: null, rating: 4, date: "2024-01-12", comment: "Great experience. Love the modern ambiance and skilled stylists." },
    ],
  },
  '6': {
    id: 6,
    name: "Glamour Zone",
    image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.8,
    reviews: 356,
    location: "Fraser Road, Patna",
    address: "Fraser Road, Near Gandhi Maidan, Patna, Bihar 800001",
    coordinates: { lat: 25.6125, lng: 85.1418 },
    timing: "9 AM - 8 PM",
    phone: "+91 98520 23456",
    description: "Glamour Zone is a premium beauty destination in the heart of Patna. Specializing in bridal makeup, skincare, and hair treatments with top international brands.",
    services: [
      { id: 1, name: "Bridal Makeup", duration: "3 hrs", price: 8000, category: "Makeup" },
      { id: 2, name: "Party Makeup", duration: "1.5 hrs", price: 2000, category: "Makeup" },
      { id: 3, name: "Gold Facial", duration: "1 hr", price: 800, category: "Skincare" },
      { id: 4, name: "Diamond Facial", duration: "1.5 hrs", price: 1200, category: "Skincare" },
      { id: 5, name: "Full Body Waxing", duration: "2 hrs", price: 1500, category: "Waxing" },
      { id: 6, name: "Mehendi", duration: "2 hrs", price: 1000, category: "Bridal" },
      { id: 7, name: "Nail Art", duration: "1 hr", price: 500, category: "Nails" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Bridal Room", "Makeup Trial"],
    reviewsList: [
      { id: 1, name: "Priyanka Kumari", avatar: null, rating: 5, date: "2024-01-20", comment: "Amazing bridal makeup! Made my wedding day perfect. Highly recommend!" },
      { id: 2, name: "Anjali Sinha", avatar: null, rating: 5, date: "2024-01-15", comment: "Best salon for facials in Patna. My skin feels so refreshed." },
    ],
  },
  '7': {
    id: 7,
    name: "Style Studio Patna",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.5,
    reviews: 178,
    location: "Kankarbagh, Patna",
    address: "Main Road, Kankarbagh, Patna, Bihar 800020",
    coordinates: { lat: 25.5941, lng: 85.1712 },
    timing: "10 AM - 8 PM",
    phone: "+91 98520 34567",
    description: "Style Studio brings affordable luxury to Kankarbagh. Expert hair and beauty services at pocket-friendly prices without compromising on quality.",
    services: [
      { id: 1, name: "Haircut & Styling", duration: "45 min", price: 200, category: "Hair" },
      { id: 2, name: "Hair Straightening", duration: "2 hrs", price: 1500, category: "Hair" },
      { id: 3, name: "Threading", duration: "15 min", price: 30, category: "Threading" },
      { id: 4, name: "Basic Facial", duration: "45 min", price: 300, category: "Skincare" },
      { id: 5, name: "Manicure", duration: "30 min", price: 200, category: "Nails" },
      { id: 6, name: "Pedicure", duration: "45 min", price: 300, category: "Nails" },
    ],
    amenities: ["AC", "WiFi"],
    reviewsList: [
      { id: 1, name: "Ritu Devi", avatar: null, rating: 4, date: "2024-01-10", comment: "Good service at affordable prices. Perfect for regular visits." },
    ],
  },
  // Bihar - Gaya Salons
  '8': {
    id: 8,
    name: "Buddha Beauty Parlour",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.6,
    reviews: 145,
    location: "Bodhgaya Road, Gaya",
    address: "Near Mahabodhi Temple, Bodhgaya Road, Gaya, Bihar 823001",
    coordinates: { lat: 24.7914, lng: 85.0002 },
    timing: "9 AM - 7 PM",
    phone: "+91 98520 45678",
    description: "Located near the sacred Mahabodhi Temple, Buddha Beauty Parlour offers traditional and modern beauty services. Perfect for tourists and locals alike.",
    services: [
      { id: 1, name: "Women's Haircut", duration: "40 min", price: 180, category: "Haircut" },
      { id: 2, name: "Traditional Facial", duration: "1 hr", price: 350, category: "Skincare" },
      { id: 3, name: "Herbal Hair Treatment", duration: "1.5 hrs", price: 600, category: "Hair" },
      { id: 4, name: "Bridal Package", duration: "4 hrs", price: 5000, category: "Bridal" },
      { id: 5, name: "Mehendi Design", duration: "1.5 hrs", price: 500, category: "Bridal" },
    ],
    amenities: ["AC", "Card Payment"],
    reviewsList: [
      { id: 1, name: "Sunita Prasad", avatar: null, rating: 5, date: "2024-01-08", comment: "Wonderful experience! The herbal treatment was amazing." },
    ],
  },
  '9': {
    id: 9,
    name: "Gaya Men's Salon",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.4,
    reviews: 98,
    location: "Station Road, Gaya",
    address: "Station Road, Near Gaya Junction, Gaya, Bihar 823001",
    coordinates: { lat: 24.7941, lng: 84.9993 },
    timing: "8 AM - 9 PM",
    phone: "+91 98520 56789",
    description: "The go-to destination for men's grooming in Gaya. Professional haircuts, shaves, and grooming services at competitive prices.",
    services: [
      { id: 1, name: "Haircut", duration: "25 min", price: 100, category: "Haircut" },
      { id: 2, name: "Shave", duration: "20 min", price: 80, category: "Grooming" },
      { id: 3, name: "Beard Trim", duration: "15 min", price: 60, category: "Grooming" },
      { id: 4, name: "Hair Color", duration: "1 hr", price: 300, category: "Hair" },
      { id: 5, name: "Face Massage", duration: "20 min", price: 150, category: "Massage" },
      { id: 6, name: "Head Massage", duration: "25 min", price: 120, category: "Massage" },
    ],
    amenities: ["AC", "WiFi"],
    reviewsList: [
      { id: 1, name: "Amit Verma", avatar: null, rating: 4, date: "2024-01-05", comment: "Quick and professional service. Good value for money." },
    ],
  },
  // Bihar - Muzaffarpur Salons
  '10': {
    id: 10,
    name: "Lichi City Salon",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.7,
    reviews: 234,
    location: "Saraiya Ganj, Muzaffarpur",
    address: "Saraiya Ganj Main Road, Muzaffarpur, Bihar 842001",
    coordinates: { lat: 26.1209, lng: 85.3647 },
    timing: "10 AM - 8 PM",
    phone: "+91 98520 67890",
    description: "Muzaffarpur's favorite beauty destination! Lichi City Salon offers premium beauty services with a warm, welcoming atmosphere.",
    services: [
      { id: 1, name: "Haircut & Blow Dry", duration: "50 min", price: 300, category: "Hair" },
      { id: 2, name: "Global Hair Color", duration: "2.5 hrs", price: 1200, category: "Hair" },
      { id: 3, name: "Keratin Treatment", duration: "3 hrs", price: 3500, category: "Hair" },
      { id: 4, name: "Party Makeup", duration: "1.5 hrs", price: 1500, category: "Makeup" },
      { id: 5, name: "Bridal Makeup", duration: "3 hrs", price: 6000, category: "Makeup" },
      { id: 6, name: "Fruit Facial", duration: "1 hr", price: 500, category: "Skincare" },
      { id: 7, name: "De-Tan Treatment", duration: "45 min", price: 400, category: "Skincare" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Parking"],
    reviewsList: [
      { id: 1, name: "Pooja Rani", avatar: null, rating: 5, date: "2024-01-17", comment: "Best salon in Muzaffarpur! The keratin treatment transformed my hair." },
      { id: 2, name: "Nisha Kumari", avatar: null, rating: 4, date: "2024-01-11", comment: "Loved the party makeup. Will definitely come back!" },
    ],
  },
  '11': {
    id: 11,
    name: "New Look Unisex Salon",
    image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.3,
    reviews: 156,
    location: "Mithanpura, Muzaffarpur",
    address: "Mithanpura Chowk, Muzaffarpur, Bihar 842002",
    coordinates: { lat: 26.1178, lng: 85.3913 },
    timing: "9 AM - 9 PM",
    phone: "+91 98520 78901",
    description: "A modern unisex salon catering to all your grooming needs. From trendy haircuts to relaxing spa treatments, we have it all.",
    services: [
      { id: 1, name: "Men's Haircut", duration: "30 min", price: 120, category: "Haircut" },
      { id: 2, name: "Women's Haircut", duration: "45 min", price: 220, category: "Haircut" },
      { id: 3, name: "Hair Spa", duration: "1 hr", price: 450, category: "Hair" },
      { id: 4, name: "Clean-up", duration: "30 min", price: 250, category: "Skincare" },
      { id: 5, name: "Threading", duration: "15 min", price: 25, category: "Threading" },
      { id: 6, name: "Waxing (Arms)", duration: "30 min", price: 150, category: "Waxing" },
    ],
    amenities: ["AC", "WiFi"],
    reviewsList: [
      { id: 1, name: "Rakesh Singh", avatar: null, rating: 4, date: "2024-01-09", comment: "Affordable and good quality service. Convenient location." },
    ],
  },
  // Bihar - Bhagalpur Salons
  '12': {
    id: 12,
    name: "Silk City Beauty Hub",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.6,
    reviews: 189,
    location: "Khalifabagh, Bhagalpur",
    address: "Khalifabagh Main Road, Bhagalpur, Bihar 812001",
    coordinates: { lat: 25.2425, lng: 87.0041 },
    timing: "10 AM - 8 PM",
    phone: "+91 98520 89012",
    description: "Bhagalpur's premium beauty destination. Silk City Beauty Hub combines traditional beauty secrets with modern techniques for stunning results.",
    services: [
      { id: 1, name: "Signature Haircut", duration: "45 min", price: 250, category: "Hair" },
      { id: 2, name: "Silk Protein Treatment", duration: "1.5 hrs", price: 800, category: "Hair" },
      { id: 3, name: "Bridal Package", duration: "5 hrs", price: 7000, category: "Bridal" },
      { id: 4, name: "Pearl Facial", duration: "1 hr", price: 600, category: "Skincare" },
      { id: 5, name: "Oxygen Facial", duration: "1.5 hrs", price: 900, category: "Skincare" },
      { id: 6, name: "Full Body Massage", duration: "1.5 hrs", price: 1200, category: "Massage" },
      { id: 7, name: "Manicure & Pedicure", duration: "1.5 hrs", price: 500, category: "Nails" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Spa Room", "Bridal Suite"],
    reviewsList: [
      { id: 1, name: "Kajal Devi", avatar: null, rating: 5, date: "2024-01-19", comment: "The silk protein treatment is a must-try! My hair is so smooth now." },
      { id: 2, name: "Rekha Sinha", avatar: null, rating: 4, date: "2024-01-14", comment: "Great ambiance and professional staff. Loved the facial." },
    ],
  },
  '13': {
    id: 13,
    name: "Trendy Looks Bhagalpur",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.4,
    reviews: 112,
    location: "Adampur, Bhagalpur",
    address: "Adampur Chowk, Bhagalpur, Bihar 812001",
    coordinates: { lat: 25.2501, lng: 86.9834 },
    timing: "9 AM - 8 PM",
    phone: "+91 98520 90123",
    description: "Your neighborhood salon for everyday beauty needs. Quality services at budget-friendly prices for the whole family.",
    services: [
      { id: 1, name: "Haircut (Men)", duration: "25 min", price: 80, category: "Haircut" },
      { id: 2, name: "Haircut (Women)", duration: "40 min", price: 150, category: "Haircut" },
      { id: 3, name: "Basic Facial", duration: "45 min", price: 280, category: "Skincare" },
      { id: 4, name: "Hair Color", duration: "1.5 hrs", price: 400, category: "Hair" },
      { id: 5, name: "Mehndi", duration: "1 hr", price: 300, category: "Bridal" },
      { id: 6, name: "Threading (Full Face)", duration: "20 min", price: 40, category: "Threading" },
    ],
    amenities: ["AC"],
    reviewsList: [
      { id: 1, name: "Suman Gupta", avatar: null, rating: 4, date: "2024-01-07", comment: "Simple and effective. Good for regular grooming." },
    ],
  },
  // Additional Patna Salon
  '14': {
    id: 14,
    name: "The Grooming Lounge",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.8,
    reviews: 267,
    location: "Patliputra Colony, Patna",
    address: "A Block, Patliputra Colony, Patna, Bihar 800013",
    coordinates: { lat: 25.6245, lng: 85.0948 },
    timing: "10 AM - 9 PM",
    phone: "+91 98520 01234",
    description: "An exclusive men's grooming destination in Patliputra. Premium haircuts, beard styling, and luxurious spa treatments in a sophisticated setting.",
    services: [
      { id: 1, name: "Executive Haircut", duration: "40 min", price: 350, category: "Haircut" },
      { id: 2, name: "Royal Shave", duration: "30 min", price: 250, category: "Grooming" },
      { id: 3, name: "Beard Sculpting", duration: "25 min", price: 200, category: "Grooming" },
      { id: 4, name: "Charcoal Facial", duration: "1 hr", price: 600, category: "Skincare" },
      { id: 5, name: "Head & Shoulder Massage", duration: "30 min", price: 300, category: "Massage" },
      { id: 6, name: "Premium Hair Spa", duration: "1.5 hrs", price: 800, category: "Hair" },
      { id: 7, name: "Groom's Package", duration: "3 hrs", price: 3000, category: "Grooming" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Parking", "Complimentary Beverages"],
    reviewsList: [
      { id: 1, name: "Vikash Kumar", avatar: null, rating: 5, date: "2024-01-21", comment: "Premium experience! The royal shave was absolutely relaxing." },
      { id: 2, name: "Sanjay Mehta", avatar: null, rating: 5, date: "2024-01-16", comment: "Best men's salon in Patna. Worth every rupee." },
    ],
  },
  // Bihar - Chakia
  '15': {
    id: 15,
    name: "Expert Hair and Skin Salon",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80",
    ],
    rating: 4.8,
    reviews: 156,
    location: "Main Road, Chakia",
    address: "Near Bus Stand, Main Road, Chakia, East Champaran, Bihar 845412",
    coordinates: { lat: 26.4167, lng: 83.8833 },
    timing: "9 AM - 8 PM",
    phone: "+91 98520 15151",
    description: "Expert Hair and Skin Salon is Chakia's leading beauty destination. We specialize in premium hair treatments, advanced skincare, and professional grooming services using top-quality products.",
    services: [
      { id: 1, name: "Men's Haircut", duration: "30 min", price: 100, category: "Haircut" },
      { id: 2, name: "Women's Haircut", duration: "45 min", price: 180, category: "Haircut" },
      { id: 3, name: "Hair Coloring", duration: "2 hrs", price: 600, category: "Hair" },
      { id: 4, name: "Hair Spa", duration: "1 hr", price: 400, category: "Hair" },
      { id: 5, name: "Keratin Treatment", duration: "3 hrs", price: 2500, category: "Hair" },
      { id: 6, name: "Gold Facial", duration: "1 hr", price: 500, category: "Skincare" },
      { id: 7, name: "Diamond Facial", duration: "1.5 hrs", price: 800, category: "Skincare" },
      { id: 8, name: "Anti-Tan Treatment", duration: "45 min", price: 350, category: "Skincare" },
      { id: 9, name: "Acne Treatment", duration: "1 hr", price: 450, category: "Skincare" },
      { id: 10, name: "Beard Styling", duration: "20 min", price: 80, category: "Grooming" },
      { id: 11, name: "Bridal Makeup", duration: "3 hrs", price: 5000, category: "Makeup" },
      { id: 12, name: "Party Makeup", duration: "1.5 hrs", price: 1500, category: "Makeup" },
      { id: 13, name: "Full Body Waxing", duration: "2 hrs", price: 800, category: "Waxing" },
      { id: 14, name: "Manicure & Pedicure", duration: "1.5 hrs", price: 400, category: "Nails" },
    ],
    amenities: ["AC", "WiFi", "Card Payment", "Parking", "Bridal Room"],
    reviewsList: [
      { id: 1, name: "Rajan Kumar", avatar: null, rating: 5, date: "2024-01-22", comment: "Best salon in Chakia! The hair spa treatment was excellent and staff is very professional." },
      { id: 2, name: "Priya Devi", avatar: null, rating: 5, date: "2024-01-18", comment: "Amazing skincare services. My skin looks so fresh after the diamond facial." },
      { id: 3, name: "Amit Singh", avatar: null, rating: 4, date: "2024-01-14", comment: "Great haircut and beard styling. Very affordable prices for such quality." },
    ],
  },
};

const timeSlots = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
];

const SalonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { coordinates } = useLocation();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { initiateUpiPayment, isProcessing: isUpiProcessing } = useUpiPayment();
  const { userReward } = useReferral();
  const { wallet, useCredits, isLoading: isWalletLoading } = useWallet();
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();
  const { addRecentSearch } = useRecentSearches();
  
  // Retry payment mode
  const isRetryMode = searchParams.get('retry') === 'true';
  const retryBookingId = searchParams.get('bookingId') || '';
  const retryService = searchParams.get('service') || '';
  const retryDate = searchParams.get('date') || '';
  const retryTime = searchParams.get('time') || '';
  
  const isFavorite = id ? checkIsFavorite(id) : false;
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('online');
  const [selectedSavedPaymentMethod, setSelectedSavedPaymentMethod] = useState<string | null>(null);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null);
  const [applyReward, setApplyReward] = useState(false);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitWalletAmount, setSplitWalletAmount] = useState(0);
  const [applyWalletCredits, setApplyWalletCredits] = useState(false);
  
  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    maxDiscount: number | null;
  } | null>(null);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<Array<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount: number | null;
    min_order_value: number | null;
  }>>([]);

  // User voucher states
  const [userVouchers, setUserVouchers] = useState<Array<{
    id: string;
    code: string;
    title: string;
    description: string | null;
    discount_type: string;
    discount_value: number;
    max_discount: number | null;
    min_order_value: number | null;
    valid_until: string | null;
    source: string;
  }>>([]);
  const [isVouchersLoading, setIsVouchersLoading] = useState(true);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: string;
    code: string;
    title: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    maxDiscount: number | null;
  } | null>(null);

  // Fetch available promo codes
  useEffect(() => {
    const fetchPromoCodes = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, max_discount, min_order_value')
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .order('discount_value', { ascending: false })
        .limit(5);
      
      if (data) {
        setAvailablePromoCodes(data);
      }
    };
    
    fetchPromoCodes();
  }, []);

  // Fetch user vouchers
  useEffect(() => {
    const fetchUserVouchers = async () => {
      if (!user) {
        setIsVouchersLoading(false);
        return;
      }
      
      setIsVouchersLoading(true);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('user_vouchers')
        .select('id, code, title, description, discount_type, discount_value, max_discount, min_order_value, valid_until, source')
        .eq('user_id', user.id)
        .eq('is_used', false)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .order('discount_value', { ascending: false });
      
      if (data) {
        setUserVouchers(data);
      }
      setIsVouchersLoading(false);
    };
    
    fetchUserVouchers();
  }, [user]);

  // Fetch salon from database
  const { salon: dbSalon, isLoading: isSalonLoading } = useSalonById(id);
  
  // Transform DB salon to expected format, fallback to static data for demo
  const salon = dbSalon ? {
    id: dbSalon.id,
    name: dbSalon.name,
    image: dbSalon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    gallery: [dbSalon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80"],
    rating: dbSalon.rating,
    reviews: dbSalon.total_reviews,
    location: dbSalon.location,
    address: dbSalon.location + ', ' + dbSalon.city,
    coordinates: null, // Could be added to DB later
    timing: `${dbSalon.opening_time?.slice(0, 5) || '09:00'} - ${dbSalon.closing_time?.slice(0, 5) || '21:00'}`,
    phone: dbSalon.phone || '+91 98765 43210',
    description: dbSalon.description || 'Premium salon offering world-class beauty services.',
    services: dbSalon.services.map((s, index) => ({
      id: index + 1,
      name: s.name,
      duration: s.duration,
      price: s.price,
      category: s.category,
    })),
    amenities: ["AC", "WiFi", "Card Payment"],
    reviewsList: [],
  } : (id ? salonsData[id] : null);

  // Calculate distance from user's location
  const salonDistance = salon && coordinates && salon.coordinates
    ? calculateDistance(
        coordinates.lat,
        coordinates.lng,
        salon.coordinates.lat,
        salon.coordinates.lng
      )
    : null;

  // Track salon view in recent searches
  useEffect(() => {
    if (id && salon) {
      const salonBasic = allSalonsList.find(s => s.id === parseInt(id));
      if (salonBasic) {
        addRecentSearch(salonBasic);
      }
    }
  }, [id, salon, addRecentSearch]);

  // Handle retry payment mode - pre-fill booking details
  useEffect(() => {
    if (!isRetryMode || !salon) return;
    
    // Pre-select service by matching name
    if (retryService) {
      const matchingService = salon.services.find((s: any) => s.name === retryService);
      if (matchingService) {
        setSelectedServices([matchingService.id]);
      }
    }
    
    // Pre-select date
    if (retryDate) {
      setSelectedDate(new Date(retryDate));
    }
    
    // Pre-select time
    if (retryTime) {
      setSelectedTime(retryTime);
    }
    
    // Show booking modal for payment retry
    if (retryBookingId) {
      setShowBookingModal(true);
      toast({
        title: 'Retry Payment',
        description: 'Select a different payment method to complete your booking.',
      });
    }
  }, [isRetryMode, retryService, retryDate, retryTime, retryBookingId, salon, toast]);

  // Show loading state while fetching from database
  if (isSalonLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading salon...</p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Salon not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectedServicesData = salon.services.filter((s: any) => selectedServices.includes(s.id));
  const subtotalPrice = selectedServicesData.reduce((sum: number, s: any) => sum + s.price, 0);
  const availableReward = userReward?.available || 0;
  const rewardDiscount = applyReward ? Math.min(availableReward, subtotalPrice) : 0;
  
  // Calculate wallet credits discount
  const walletBalance = wallet?.balance || 0;
  const priceAfterReward = subtotalPrice - rewardDiscount;
  const walletCreditsDiscount = applyWalletCredits ? Math.min(walletBalance, priceAfterReward) : 0;
  
  // Calculate voucher discount
  const calculateVoucherDiscount = () => {
    if (!appliedVoucher) return 0;
    const priceAfterWallet = subtotalPrice - rewardDiscount - walletCreditsDiscount;
    if (appliedVoucher.discountType === 'percentage') {
      const discount = (priceAfterWallet * appliedVoucher.discountValue) / 100;
      return appliedVoucher.maxDiscount ? Math.min(discount, appliedVoucher.maxDiscount) : discount;
    }
    return Math.min(appliedVoucher.discountValue, priceAfterWallet);
  };
  
  const voucherDiscount = calculateVoucherDiscount();
  
  // Calculate promo discount (only if no voucher applied)
  const calculatePromoDiscount = () => {
    if (!appliedPromo || appliedVoucher) return 0; // Voucher takes priority over promo
    const priceAfterCredits = subtotalPrice - rewardDiscount - walletCreditsDiscount;
    if (appliedPromo.discountType === 'percentage') {
      const discount = (priceAfterCredits * appliedPromo.discountValue) / 100;
      return appliedPromo.maxDiscount ? Math.min(discount, appliedPromo.maxDiscount) : discount;
    }
    return Math.min(appliedPromo.discountValue, priceAfterCredits);
  };
  
  const promoDiscount = calculatePromoDiscount();
  const totalPrice = Math.max(0, subtotalPrice - rewardDiscount - walletCreditsDiscount - voucherDiscount - promoDiscount);
  const totalDiscount = rewardDiscount + walletCreditsDiscount + voucherDiscount + promoDiscount;
  const totalDuration = selectedServicesData.reduce((sum: string, s: any) => {
    const match = s.duration.match(/(\d+\.?\d*)/);
    return match ? sum + parseFloat(match[0]) : sum;
  }, 0);

  // Apply a user voucher
  const applyVoucher = (voucher: typeof userVouchers[0]) => {
    // Check min order value
    if (voucher.min_order_value && subtotalPrice < voucher.min_order_value) {
      toast({
        title: 'Minimum order not met',
        description: `This voucher requires a minimum order of ₹${voucher.min_order_value}`,
        variant: 'destructive',
      });
      return;
    }
    
    setAppliedVoucher({
      id: voucher.id,
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discount_type as 'fixed' | 'percentage',
      discountValue: voucher.discount_value,
      maxDiscount: voucher.max_discount,
    });
    
    // Remove promo if voucher is applied
    if (appliedPromo) {
      setAppliedPromo(null);
    }
    
    toast({
      title: 'Voucher Applied!',
      description: `${voucher.title} - ${voucher.discount_type === 'percentage' ? `${voucher.discount_value}% OFF` : `₹${voucher.discount_value} OFF`}`,
    });
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  // Validate and apply promo code
  const applyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      // Check if promo code exists and is valid
      const { data: promoData, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCodeInput.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promoData) {
        setPromoError('Invalid promo code');
        setIsValidatingPromo(false);
        return;
      }

      // Check if code has expired
      if (promoData.valid_until && new Date(promoData.valid_until) < new Date()) {
        setPromoError('This promo code has expired');
        setIsValidatingPromo(false);
        return;
      }

      // Check if code hasn't started yet
      if (promoData.valid_from && new Date(promoData.valid_from) > new Date()) {
        setPromoError('This promo code is not yet active');
        setIsValidatingPromo(false);
        return;
      }

      // Check usage limit
      if (promoData.usage_limit && promoData.used_count >= promoData.usage_limit) {
        setPromoError('This promo code has reached its usage limit');
        setIsValidatingPromo(false);
        return;
      }

      // Check minimum order value
      if (promoData.min_order_value && subtotalPrice < promoData.min_order_value) {
        setPromoError(`Minimum order value is ₹${promoData.min_order_value}`);
        setIsValidatingPromo(false);
        return;
      }

      // Check if user has already used this code
      if (user) {
        const { data: usageData } = await supabase
          .from('promo_code_usage')
          .select('id')
          .eq('promo_code_id', promoData.id)
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (usageData) {
          setPromoError('You have already used this promo code');
          setIsValidatingPromo(false);
          return;
        }
      }

      // Apply the promo code
      setAppliedPromo({
        id: promoData.id,
        code: promoData.code,
        discountType: promoData.discount_type as 'fixed' | 'percentage',
        discountValue: promoData.discount_value,
        maxDiscount: promoData.max_discount,
      });
      setPromoCodeInput('');
      
      toast({
        title: 'Promo Applied!',
        description: `${promoData.code} applied successfully`,
      });
    } catch (err) {
      setPromoError('Failed to validate promo code');
    }

    setIsValidatingPromo(false);
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      toast({
        title: 'Please complete selection',
        description: 'Select at least one service, date, and time.',
        variant: 'destructive',
      });
      return;
    }

    setIsBooking(true);

    const serviceNames = selectedServicesData.map((s: any) => s.name).join(', ');
    
    // Calculate amounts - wallet can be used with any payment method now
    const walletPaymentAmount = splitWalletAmount;
    const remainingAmount = totalPrice - splitWalletAmount;

    // Create new booking or update existing one (retry mode)
    const bookingStatus = paymentMethod === 'online' || paymentMethod === 'upi' 
      ? 'pending_payment' 
      : 'upcoming';

    let bookingData: { id: string } | null = null;
    let bookingError: Error | null = null;

    if (isRetryMode && retryBookingId) {
      // Update existing booking for retry
      const { data, error } = await supabase
        .from('bookings')
        .update({
          service_price: totalPrice,
          status: bookingStatus,
        })
        .eq('id', retryBookingId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      bookingData = data;
      bookingError = error;
    } else {
      // Create new booking
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          salon_id: dbSalon?.id || null, // Link to actual salon in database
          salon_name: salon.name,
          service_name: serviceNames,
          service_price: totalPrice,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          booking_time: selectedTime,
          status: bookingStatus,
        })
        .select()
        .single();
      
      bookingData = data;
      bookingError = error;
    }

    if (bookingError || !bookingData) {
      setIsBooking(false);
      toast({
        title: 'Booking failed',
        description: 'Unable to complete booking. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Handle wallet payment - deduct from wallet
    if (walletPaymentAmount > 0) {
      await useCredits({
        amount: walletPaymentAmount,
        category: 'booking_discount',
        description: `Wallet payment for booking at ${salon.name}`,
        referenceId: bookingData.id,
      });
    }

    // If UPI payment with selected app, use deep link
    if (paymentMethod === 'upi' && selectedUpiApp && isMobileDevice()) {
      const upiResult = await initiateUpiPayment(selectedUpiApp, {
        amount: totalPrice,
        merchantVpa: 'merchant@upi', // This should be your actual merchant VPA
        merchantName: salon.name,
        transactionNote: `Booking at ${salon.name}`,
        orderId: bookingData.id,
      });

      if (upiResult.success) {
        // Mark reward as used if applied
        if (applyReward && rewardDiscount > 0) {
          await markRewardAsUsed();
        }

        // Deduct wallet credits if applied
        if (applyWalletCredits && walletCreditsDiscount > 0) {
          await useCredits({
            amount: walletCreditsDiscount,
            category: 'booking_discount',
            description: `Used for booking at ${salon.name}`,
            referenceId: bookingData.id,
          });
        }

        // Record promo code usage
        if (appliedPromo && user) {
          await supabase.from('promo_code_usage').insert({
            promo_code_id: appliedPromo.id,
            user_id: user.id,
            booking_id: bookingData.id,
          });
        }

        // Mark voucher as used
        if (appliedVoucher && user) {
          await supabase
            .from('user_vouchers')
            .update({ 
              is_used: true, 
              used_at: new Date().toISOString(),
              booking_id: bookingData.id 
            })
            .eq('id', appliedVoucher.id);
        }

        setShowBookingModal(false);
        setSelectedServices([]);
        setApplyReward(false);
        setApplyWalletCredits(false);
        setAppliedPromo(null);
        setAppliedVoucher(null);
        setIsSplitPayment(false);
        setSplitWalletAmount(0);
        setSelectedUpiApp(null);
        
        // Note: In production, you'd verify payment via webhook before confirming
        toast({
          title: `Opening ${getUpiAppName(selectedUpiApp)}`,
          description: 'Complete payment in the app. Your booking will be confirmed after payment.',
        });

        const params = new URLSearchParams({
          salon: salon.name,
          service: serviceNames,
          price: totalPrice.toString(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          paymentMethod: 'upi',
          upiApp: selectedUpiApp,
          discount: totalDiscount.toString(),
          pending: 'true', // Mark as pending UPI verification
          bookingId: bookingData.id, // Include booking ID for status verification
          ...(appliedPromo && { promoCode: appliedPromo.code, promoDiscount: promoDiscount.toString() }),
          ...(appliedVoucher && { voucherCode: appliedVoucher.code, voucherDiscount: voucherDiscount.toString() }),
          ...(rewardDiscount > 0 && { rewardDiscount: rewardDiscount.toString() }),
          ...(walletCreditsDiscount > 0 && { walletDiscount: walletCreditsDiscount.toString() }),
        });
        
        navigate(`/booking-confirmation?${params.toString()}`);
      }
      
      setIsBooking(false);
      return;
    }

    // If online payment (cards, UPI without app selection) selected, initiate Razorpay
    if (paymentMethod === 'online' || paymentMethod === 'upi') {
      const paymentResult = await initiatePayment({
        amount: totalPrice,
        bookingId: bookingData.id,
        salonName: salon.name,
        serviceName: serviceNames,
        customerPhone: user.phone || '',
      });

      setIsBooking(false);

      if (paymentResult.success) {
        // Mark reward as used if applied
        if (applyReward && rewardDiscount > 0) {
          await markRewardAsUsed();
        }

        // Deduct wallet credits if applied
        if (applyWalletCredits && walletCreditsDiscount > 0) {
          await useCredits({
            amount: walletCreditsDiscount,
            category: 'booking_discount',
            description: `Used for booking at ${salon.name}`,
            referenceId: bookingData.id,
          });
        }

        // Record promo code usage
        if (appliedPromo && user) {
          await supabase.from('promo_code_usage').insert({
            promo_code_id: appliedPromo.id,
            user_id: user.id,
            booking_id: bookingData.id,
          });
        }

        // Mark voucher as used
        if (appliedVoucher && user) {
          await supabase
            .from('user_vouchers')
            .update({ 
              is_used: true, 
              used_at: new Date().toISOString(),
              booking_id: bookingData.id 
            })
            .eq('id', appliedVoucher.id);
        }

        setShowBookingModal(false);
        setSelectedServices([]);
        setApplyReward(false);
        setApplyWalletCredits(false);
        setAppliedPromo(null);
        setAppliedVoucher(null);
        setIsSplitPayment(false);
        setSplitWalletAmount(0);
        
        toast({
          title: 'Payment Successful!',
          description: totalDiscount > 0 
            ? `Your booking is confirmed! You saved ₹${totalDiscount}.`
            : 'Your booking has been confirmed.',
        });

        const params = new URLSearchParams({
          salon: salon.name,
          service: serviceNames,
          price: totalPrice.toString(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          paymentId: paymentResult.paymentId || '',
          paymentMethod: paymentMethod,
          discount: totalDiscount.toString(),
          ...(appliedPromo && { promoCode: appliedPromo.code, promoDiscount: promoDiscount.toString() }),
          ...(appliedVoucher && { voucherCode: appliedVoucher.code, voucherDiscount: voucherDiscount.toString() }),
          ...(rewardDiscount > 0 && { rewardDiscount: rewardDiscount.toString() }),
          ...(walletCreditsDiscount > 0 && { walletDiscount: walletCreditsDiscount.toString() }),
        });
        
        navigate(`/booking-confirmation?${params.toString()}`);
      } else {
        // Payment failed or cancelled, update booking status
        await supabase
          .from('bookings')
          .update({ status: 'payment_failed' })
          .eq('id', bookingData.id);

        if (paymentResult.error !== 'Payment cancelled') {
          toast({
            title: 'Payment Failed',
            description: paymentResult.error || 'Please try again.',
            variant: 'destructive',
          });
        }
      }
    } else {
      // Pay at salon or split payment - complete booking
      if (applyReward && rewardDiscount > 0) {
        await markRewardAsUsed();
      }

      // Deduct wallet credits if applied (non-split)
      if (!isSplitPayment && applyWalletCredits && walletCreditsDiscount > 0) {
        await useCredits({
          amount: walletCreditsDiscount,
          category: 'booking_discount',
          description: `Used for booking at ${salon.name}`,
          referenceId: bookingData.id,
        });
      }

      // Record promo code usage for salon payment
      if (appliedPromo && user) {
        await supabase.from('promo_code_usage').insert({
          promo_code_id: appliedPromo.id,
          user_id: user.id,
          booking_id: bookingData.id,
        });
      }

      // Mark voucher as used for salon payment
      if (appliedVoucher && user) {
        await supabase
          .from('user_vouchers')
          .update({ 
            is_used: true, 
            used_at: new Date().toISOString(),
            booking_id: bookingData.id 
          })
          .eq('id', appliedVoucher.id);
      }

      setIsBooking(false);
      setShowBookingModal(false);
      setSelectedServices([]);
      setApplyReward(false);
      setApplyWalletCredits(false);
      setAppliedPromo(null);
      setAppliedVoucher(null);
      setIsSplitPayment(false);
      setSplitWalletAmount(0);

      const toastMessage = walletPaymentAmount > 0
        ? `₹${walletPaymentAmount} paid from wallet. Pay ₹${remainingAmount} at the salon.`
        : totalDiscount > 0 
          ? `You saved ₹${totalDiscount}. Pay ₹${totalPrice} at the salon.`
          : 'Your appointment is booked.';

      toast({
        title: 'Booking Confirmed!',
        description: toastMessage,
      });

      const params = new URLSearchParams({
        salon: salon.name,
        service: serviceNames,
        price: remainingAmount.toString(),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        paymentMethod: paymentMethod,
        discount: totalDiscount.toString(),
        ...(walletPaymentAmount > 0 && { walletPaid: walletPaymentAmount.toString() }),
        ...(appliedPromo && { promoCode: appliedPromo.code, promoDiscount: promoDiscount.toString() }),
        ...(appliedVoucher && { voucherCode: appliedVoucher.code, voucherDiscount: voucherDiscount.toString() }),
        ...(rewardDiscount > 0 && { rewardDiscount: rewardDiscount.toString() }),
        ...(walletCreditsDiscount > 0 && { walletDiscount: walletCreditsDiscount.toString() }),
      });
      
      navigate(`/booking-confirmation?${params.toString()}`);
    }
  };

  // Function to mark referral reward as used
  const markRewardAsUsed = async () => {
    if (!user) return;

    // First try to mark referrer reward
    const { data: referrerReward } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', user.id)
      .eq('status', 'completed')
      .eq('referrer_reward_used', false)
      .limit(1)
      .maybeSingle();

    if (referrerReward) {
      await supabase
        .from('referrals')
        .update({ referrer_reward_used: true })
        .eq('id', referrerReward.id);
      return;
    }

    // Then try referee reward
    const { data: refereeReward } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', user.id)
      .eq('status', 'completed')
      .eq('referee_reward_used', false)
      .limit(1)
      .maybeSingle();

    if (refereeReward) {
      await supabase
        .from('referrals')
        .update({ referee_reward_used: true })
        .eq('id', refereeReward.id);
    }
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  const serviceCategories = [...new Set(salon.services.map((s: any) => s.category))];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Image */}
      <div className="relative h-72 sm:h-96">
        <img
          src={salon.image}
          alt={salon.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.share?.({ title: salon.name, url: window.location.href });
              }}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => id && toggleFavorite(id)}
              className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Salon Info */}
      <div className="px-4 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-elegant p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                {salon.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{salon.location}</span>
                {salonDistance !== null && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                      {formatDistance(salonDistance)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold text-primary">{salon.rating}</span>
              <span className="text-muted-foreground text-sm">({salon.reviews})</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{salon.timing}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${salon.phone}`} className="text-primary hover:underline">
                {salon.phone}
              </a>
            </div>
            {salonDistance !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span>{estimateTravelTime(salonDistance).driving} drive</span>
              </div>
            )}
            {salon.coordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates.lat},${salon.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </a>
            )}
          </div>

          <p className="text-muted-foreground text-sm">{salon.description}</p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mt-4">
            {salon.amenities.map((amenity: string) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="stylists">Stylists</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            {serviceCategories.map((category: string) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="space-y-3">
                  {salon.services
                    .filter((s: any) => s.category === category)
                    .map((service: any) => (
                      <motion.div
                        key={service.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleService(service.id)}
                        className={`bg-card rounded-xl p-4 cursor-pointer transition-all ${
                          selectedServices.includes(service.id)
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">{service.duration}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-primary">₹{service.price}</span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedServices.includes(service.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}>
                              {selectedServices.includes(service.id) && (
                                <Check className="w-4 h-4 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Stylists Tab */}
          <TabsContent value="stylists">
            <StylistsList salonId={id || ''} />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {/* Show mock reviews + real reviews from database */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{salon.rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(salon.rating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{salon.reviews}+ reviews</p>
              </div>
            </div>

            {/* Mock reviews from salon data */}
            {salon.reviewsList.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {review.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{review.name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div className="flex mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Real reviews from database */}
            <SalonReviews salonId={id || ''} />
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Address</h4>
                    <p className="text-sm text-muted-foreground">{salon.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Map view coming soon</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(salon.address)}`, '_blank')}
                >
                  Open in Google Maps
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Business Hours</h4>
                    <p className="text-sm text-muted-foreground">{salon.timing}</p>
                    <p className="text-xs text-muted-foreground mt-1">Open all days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fixed Bottom Bar */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </p>
                <p className="font-semibold text-lg">₹{totalPrice}</p>
              </div>
              <Button onClick={() => setShowBookingModal(true)} size="lg">
                Book Now
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={(open) => {
        setShowBookingModal(open);
        if (!open) setBookingStep(1);
      }}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 flex flex-col overflow-hidden">
          {/* Step Progress Indicator - Fixed Header */}
          <div className="flex-shrink-0 bg-background border-b border-border/50 px-6 py-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5" />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-4">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    bookingStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {bookingStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${bookingStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Schedule
                  </span>
                </div>
                
                {/* Connector */}
                <div className={`w-12 h-0.5 rounded-full transition-all ${bookingStep > 1 ? 'bg-primary' : 'bg-muted'}`} />
                
                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    bookingStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    2
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${bookingStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Payment
                  </span>
                </div>
              </div>
              
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-xl font-display flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  Complete Your Booking
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {bookingStep === 1 ? 'Select your preferred date and time' : 'Apply offers and complete payment'}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait" initial={false}>
              {/* Step 1: Schedule */}
              {bookingStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                  className="p-6 space-y-6"
                >
                {/* Selected Services Summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">Selected Services</h4>
                  </div>
                  <div className="space-y-2 pl-10">
                    {selectedServicesData.map((service: any) => (
                      <div key={service.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.duration}</p>
                        </div>
                        <p className="text-sm font-semibold">₹{service.price}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-semibold">Subtotal</span>
                      <span className="text-base font-bold text-primary">₹{subtotalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">Select Date</h4>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {next7Days.map((date, idx) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center min-w-[68px] p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                          selectedDate?.toDateString() === date.toDateString()
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'border-border hover:border-primary bg-muted/20'
                        } ${idx === 0 ? 'ring-2 ring-primary/20' : ''}`}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{format(date, 'EEE')}</span>
                        <span className="text-xl font-bold">{format(date, 'd')}</span>
                        <span className="text-[10px] opacity-80">{format(date, 'MMM')}</span>
                        {idx === 0 && (
                          <span className="text-[8px] font-medium bg-primary/20 rounded-full px-1.5 py-0.5 mt-1">Today</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm">Select Time</h4>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2.5 rounded-xl text-sm font-medium border-2 transition-all hover:scale-[1.02] ${
                          selectedTime === time
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'border-border hover:border-primary bg-muted/20'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 1 Footer */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 -mb-6 p-4 mt-6">
                  <Button
                    className="w-full h-14 text-base font-semibold rounded-xl shadow-lg"
                    size="lg"
                    onClick={() => setBookingStep(2)}
                    disabled={!selectedDate || !selectedTime}
                  >
                    <div className="flex items-center gap-2">
                      Continue to Payment
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </Button>
                  {(!selectedDate || !selectedTime) && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {!selectedDate ? 'Please select a date' : 'Please select a time'}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Offers & Payment */}
            {bookingStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  opacity: { duration: 0.2 }
                }}
                className="p-6 space-y-6"
              >
                {/* Booking Summary Mini */}
                <button
                  onClick={() => setBookingStep(1)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">
                        {selectedDate && format(selectedDate, 'EEE, MMM d')} at {selectedTime}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedServicesData.length} service{selectedServicesData.length > 1 ? 's' : ''} • ₹{subtotalPrice}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                </button>

                {/* Discounts & Rewards Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-sm">Rewards & Credits</h4>
                  </div>

                  {/* Referral Reward Discount */}
                  {availableReward > 0 && (
                    <div>
                      {!applyReward ? (
                        <button
                          onClick={() => setApplyReward(true)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-all hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                              <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300 block">Referral Reward</span>
                              <span className="text-xs text-green-600/70 dark:text-green-400/70">₹{availableReward} available</span>
                            </div>
                          </div>
                          <Badge className="bg-green-600 hover:bg-green-600 text-white">Apply</Badge>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300 block">Reward Applied!</span>
                              <span className="text-xs text-green-600/70 dark:text-green-400/70">Referral bonus</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-green-600 dark:text-green-400">-₹{rewardDiscount}</span>
                            <button 
                              onClick={() => setApplyReward(false)}
                              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wallet Credits Section */}
                  {walletBalance > 0 && (
                    <div>
                      {!applyWalletCredits ? (
                        <button
                          onClick={() => setApplyWalletCredits(true)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="text-left">
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 block">Wallet Credits</span>
                              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Balance: ₹{walletBalance}</span>
                            </div>
                          </div>
                          <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Use ₹{Math.min(walletBalance, priceAfterReward)}</Badge>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                              <Check className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 block">Credits Applied!</span>
                              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Wallet balance used</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-amber-600 dark:text-amber-400">-₹{walletCreditsDiscount}</span>
                            <button 
                              onClick={() => setApplyWalletCredits(false)}
                              className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {availableReward === 0 && walletBalance === 0 && userVouchers.length === 0 && !isWalletLoading && !isVouchersLoading && (
                    <p className="text-sm text-muted-foreground text-center py-2">No rewards or credits available</p>
                  )}

                  {(isWalletLoading || isVouchersLoading) && availableReward === 0 && walletBalance === 0 && userVouchers.length === 0 && (
                    <div className="flex items-center justify-center py-2 gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  )}
                </div>

                {/* User Vouchers Section */}
                {userVouchers.length > 0 && !appliedVoucher && !appliedPromo && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-sm">My Vouchers</h4>
                      <Badge variant="secondary" className="ml-auto text-xs">{userVouchers.length} available</Badge>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {userVouchers.map((voucher) => {
                        const discountText = voucher.discount_type === 'percentage'
                          ? `${voucher.discount_value}% OFF`
                          : `₹${voucher.discount_value} OFF`;
                        const canApply = !voucher.min_order_value || subtotalPrice >= voucher.min_order_value;
                        
                        return (
                          <button
                            key={voucher.id}
                            onClick={() => applyVoucher(voucher)}
                            disabled={!canApply}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                              canApply 
                                ? 'border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:scale-[1.01]' 
                                : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 truncate">
                                  {voucher.title}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {voucher.min_order_value ? `Min ₹${voucher.min_order_value}` : 'No minimum'}
                                {voucher.valid_until && ` • Expires ${format(new Date(voucher.valid_until), 'MMM dd')}`}
                              </p>
                            </div>
                            {canApply ? (
                              <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-xs">{discountText}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{discountText}</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Applied Voucher Display */}
                {appliedVoucher && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="font-semibold text-sm">Applied Voucher</h4>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                          <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300 block">
                            {appliedVoucher.title}
                          </span>
                          <span className="text-xs text-purple-600/70 dark:text-purple-400/70">{appliedVoucher.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                          -₹{voucherDiscount.toFixed(0)}
                        </span>
                        <button 
                          onClick={removeVoucher}
                          className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Promo Code Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-sm">Promo Code</h4>
                  </div>
                  
                  {!appliedPromo ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="ENTER PROMO CODE"
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            setPromoError('');
                          }}
                          className="flex-1 uppercase font-medium tracking-wide h-12 rounded-xl bg-muted/30 border-2 border-dashed focus:border-primary"
                        />
                        <Button 
                          variant="default" 
                          onClick={applyPromoCode}
                          disabled={isValidatingPromo || !promoCodeInput}
                          className="h-12 px-6 rounded-xl"
                        >
                          {isValidatingPromo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {promoError}
                        </p>
                      )}
                      
                      {/* Available Promo Codes */}
                      {availablePromoCodes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Available offers:</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {availablePromoCodes.map((promo) => {
                              const discountText = promo.discount_type === 'percentage' 
                                ? `${promo.discount_value}% OFF${promo.max_discount ? ` (Max ₹${promo.max_discount})` : ''}`
                                : `₹${promo.discount_value} OFF`;
                              const minOrderText = promo.min_order_value ? `Min ₹${promo.min_order_value}` : '';
                              
                              return (
                                <button
                                  key={promo.id}
                                  onClick={() => {
                                    setPromoCodeInput(promo.code);
                                    setPromoError('');
                                  }}
                                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all hover:scale-[1.02]"
                                >
                                  <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{promo.code}</p>
                                    <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                                      {discountText} {minOrderText && `• ${minOrderText}`}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 block">
                            {appliedPromo.code}
                          </span>
                          <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Promo applied</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                          -₹{promoDiscount.toFixed(0)}
                        </span>
                        <button 
                          onClick={removePromoCode}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Section */}
                <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subtotal</span>
                    <span className="text-sm">₹{subtotalPrice}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <span className="text-sm">Total Savings</span>
                      <span className="text-sm font-semibold">-₹{totalDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="font-semibold">Total Amount</span>
                    <div className="flex items-center gap-2">
                      {totalDiscount > 0 && (
                        <span className="text-sm text-muted-foreground line-through">₹{subtotalPrice}</span>
                      )}
                      <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
                    </div>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        You're saving ₹{totalDiscount} on this booking!
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Method Selection - Only show if there's amount to pay */}
                {totalPrice > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="font-semibold text-sm">Payment Method</h4>
                    </div>
                    <PaymentMethodSelector
                      selectedMethod={paymentMethod}
                      onMethodChange={setPaymentMethod}
                      totalAmount={totalPrice}
                      walletBalance={walletBalance}
                      walletAmountToUse={splitWalletAmount}
                      onWalletAmountChange={setSplitWalletAmount}
                      selectedSavedMethodId={selectedSavedPaymentMethod}
                      onSavedMethodSelect={setSelectedSavedPaymentMethod}
                      selectedUpiAppId={selectedUpiApp}
                      onUpiAppSelect={setSelectedUpiApp}
                    />
                  </div>
                )}

                {/* Show message when fully covered by credits */}
                {totalPrice === 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-300">Fully covered!</p>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80">No payment required</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 Footer */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 -mx-6 -mb-6 p-4 mt-6">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="h-14 px-6 rounded-xl"
                      onClick={() => setBookingStep(1)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      className="flex-1 h-14 text-base font-semibold rounded-xl shadow-lg"
                      size="lg"
                      onClick={handleBooking}
                      disabled={isBooking || isPaymentLoading || isUpiProcessing}
                    >
                      {isBooking || isPaymentLoading || isUpiProcessing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </div>
                      ) : paymentMethod === 'upi' && selectedUpiApp ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Pay ₹{totalPrice} with {getUpiAppName(selectedUpiApp)}
                        </div>
                      ) : paymentMethod === 'online' || paymentMethod === 'upi' ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Pay ₹{totalPrice}
                        </div>
                      ) : splitWalletAmount > 0 ? (
                        <div className="flex items-center gap-2">
                          <Wallet className="w-5 h-5" />
                          Pay ₹{splitWalletAmount} + ₹{totalPrice - splitWalletAmount}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5" />
                          Confirm Booking • ₹{totalPrice}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
      <BackToTop />
    </div>
  );
};

export default SalonDetail;
