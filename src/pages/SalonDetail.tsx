import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Heart, Share2, 
  ChevronRight, Calendar, Check, User, MessageSquare, CreditCard, Gift, X,
  Tag, Loader2, Wallet
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRazorpay } from '@/hooks/useRazorpay';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { SalonReviews } from '@/components/SalonReviews';
import StylistsList from '@/components/StylistsList';
import { useReferral } from '@/hooks/useReferral';
import { useWallet } from '@/hooks/useWallet';

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
    distance: "1.2 km",
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
    distance: "2.5 km",
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
    distance: "3.1 km",
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
    distance: "4.0 km",
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
    distance: "1.5 km",
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
    distance: "2.0 km",
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
    distance: "3.5 km",
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
    distance: "0.8 km",
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
    distance: "1.2 km",
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
    distance: "1.0 km",
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
    distance: "2.5 km",
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
    distance: "0.5 km",
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
    distance: "1.8 km",
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
    distance: "4.2 km",
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
    distance: "0.5 km",
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
  const { toast } = useToast();
  const { user } = useAuth();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { userReward } = useReferral();
  const { wallet, useCredits } = useWallet();
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'salon'>('online');
  const [applyReward, setApplyReward] = useState(false);
  const [applyWalletCredits, setApplyWalletCredits] = useState(false);
  
  // Promo code states
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    maxDiscount: number | null;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [availablePromoCodes, setAvailablePromoCodes] = useState<Array<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    max_discount: number | null;
    min_order_value: number | null;
  }>>([]);

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

  const salon = id ? salonsData[id] : null;

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
  
  // Calculate promo discount
  const calculatePromoDiscount = () => {
    if (!appliedPromo) return 0;
    const priceAfterCredits = subtotalPrice - rewardDiscount - walletCreditsDiscount;
    if (appliedPromo.discountType === 'percentage') {
      const discount = (priceAfterCredits * appliedPromo.discountValue) / 100;
      return appliedPromo.maxDiscount ? Math.min(discount, appliedPromo.maxDiscount) : discount;
    }
    return Math.min(appliedPromo.discountValue, priceAfterCredits);
  };
  
  const promoDiscount = calculatePromoDiscount();
  const totalPrice = Math.max(0, subtotalPrice - rewardDiscount - walletCreditsDiscount - promoDiscount);
  const totalDiscount = rewardDiscount + walletCreditsDiscount + promoDiscount;
  const totalDuration = selectedServicesData.reduce((sum: string, s: any) => {
    const match = s.duration.match(/(\d+\.?\d*)/);
    return match ? sum + parseFloat(match[0]) : sum;
  }, 0);

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

    // Create booking first
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        salon_name: salon.name,
        service_name: serviceNames,
        service_price: totalPrice,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        booking_time: selectedTime,
        status: paymentMethod === 'online' ? 'pending_payment' : 'upcoming',
      })
      .select()
      .single();

    if (bookingError) {
      setIsBooking(false);
      toast({
        title: 'Booking failed',
        description: 'Unable to complete booking. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // If online payment selected, initiate Razorpay
    if (paymentMethod === 'online') {
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

        setShowBookingModal(false);
        setSelectedServices([]);
        setApplyReward(false);
        setApplyWalletCredits(false);
        setAppliedPromo(null);
        
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
          discount: totalDiscount.toString(),
          ...(appliedPromo && { promoCode: appliedPromo.code, promoDiscount: promoDiscount.toString() }),
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
      // Pay at salon - mark reward as used if applied
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

      // Record promo code usage for salon payment
      if (appliedPromo && user) {
        await supabase.from('promo_code_usage').insert({
          promo_code_id: appliedPromo.id,
          user_id: user.id,
          booking_id: bookingData.id,
        });
      }

      setIsBooking(false);
      setShowBookingModal(false);
      setSelectedServices([]);
      setApplyReward(false);
      setApplyWalletCredits(false);
      setAppliedPromo(null);

      toast({
        title: 'Booking Confirmed!',
        description: totalDiscount > 0 
          ? `You saved ₹${totalDiscount}. Pay ₹${totalPrice} at the salon.`
          : 'Your appointment is booked.',
      });

      const params = new URLSearchParams({
        salon: salon.name,
        service: serviceNames,
        price: totalPrice.toString(),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        discount: totalDiscount.toString(),
        ...(appliedPromo && { promoCode: appliedPromo.code, promoDiscount: promoDiscount.toString() }),
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
              onClick={() => setIsFavorite(!isFavorite)}
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
                <MapPin className="w-4 h-4" />
                <span>{salon.location}</span>
                <span>•</span>
                <span>{salon.distance}</span>
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
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Booking</DialogTitle>
          </DialogHeader>

          {/* Selected Services Summary */}
          <div className="space-y-2 mb-4">
            <h4 className="font-medium text-sm">Selected Services</h4>
            {selectedServicesData.map((service: any) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span>{service.name}</span>
                <span className="text-muted-foreground">₹{service.price}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Subtotal</span>
              <span>₹{subtotalPrice}</span>
            </div>

            {/* Referral Reward Discount */}
            {availableReward > 0 && (
              <div className="space-y-2">
                {!applyReward ? (
                  <button
                    onClick={() => setApplyReward(true)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Apply ₹{availableReward} Reward</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Tap to apply</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Reward Applied!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">-₹{rewardDiscount}</span>
                      <button 
                        onClick={() => setApplyReward(false)}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
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
              <div className="space-y-2">
                {!applyWalletCredits ? (
                  <button
                    onClick={() => setApplyWalletCredits(true)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Use ₹{Math.min(walletBalance, priceAfterReward)} Wallet Credits
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Balance: ₹{walletBalance}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Credits Applied!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">-₹{walletCreditsDiscount}</span>
                      <button 
                        onClick={() => setApplyWalletCredits(false)}
                        className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800 rounded"
                      >
                        <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Promo Code Section */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Promo Code
              </h4>
              
              {!appliedPromo ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCodeInput}
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      className="flex-1 uppercase"
                    />
                    <Button 
                      variant="outline" 
                      onClick={applyPromoCode}
                      disabled={isValidatingPromo}
                    >
                      {isValidatingPromo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-destructive">{promoError}</p>
                  )}
                  
                  {/* Available Promo Codes */}
                  {availablePromoCodes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Available offers:</p>
                      <div className="flex flex-wrap gap-2">
                        {availablePromoCodes.map((promo) => {
                          const discountText = promo.discount_type === 'percentage' 
                            ? `${promo.discount_value}% OFF${promo.max_discount ? ` (Max ₹${promo.max_discount})` : ''}`
                            : `₹${promo.discount_value} OFF`;
                          const minOrderText = promo.min_order_value ? ` • Min ₹${promo.min_order_value}` : '';
                          
                          return (
                            <button
                              key={promo.id}
                              onClick={() => {
                                setPromoCodeInput(promo.code);
                                setPromoError('');
                              }}
                              className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <div className="text-left">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{promo.code}</p>
                                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                                  {discountText}{minOrderText}
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
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {appliedPromo.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      -₹{promoDiscount.toFixed(0)}
                    </span>
                    <button 
                      onClick={removePromoCode}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                    >
                      <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <div className="flex items-center gap-2">
                {totalDiscount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">₹{subtotalPrice}</span>
                )}
                <span className="text-primary">₹{totalPrice}</span>
              </div>
            </div>
            {totalDiscount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 text-center">
                🎉 You're saving ₹{totalDiscount} on this booking!
              </p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Select Date</h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {next7Days.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center min-w-[60px] p-3 rounded-xl border transition-colors ${
                    selectedDate?.toDateString() === date.toDateString()
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <span className="text-xs">{format(date, 'EEE')}</span>
                  <span className="text-lg font-semibold">{format(date, 'd')}</span>
                  <span className="text-xs">{format(date, 'MMM')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Select Time</h4>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-2 rounded-lg text-sm border transition-colors ${
                    selectedTime === time
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Payment Method</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('online')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  paymentMethod === 'online'
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${paymentMethod === 'online' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${paymentMethod === 'online' ? 'text-primary' : ''}`}>Pay Online</p>
                  <p className="text-xs text-muted-foreground">Cards, UPI, Wallets</p>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('salon')}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  paymentMethod === 'salon'
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <MapPin className={`w-5 h-5 ${paymentMethod === 'salon' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${paymentMethod === 'salon' ? 'text-primary' : ''}`}>Pay at Salon</p>
                  <p className="text-xs text-muted-foreground">Cash or Card</p>
                </div>
              </button>
            </div>
          </div>

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime || isBooking || isPaymentLoading}
          >
            {isBooking || isPaymentLoading ? 'Processing...' : paymentMethod === 'online' ? `Pay ₹${totalPrice}` : `Confirm Booking - ₹${totalPrice}`}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalonDetail;
