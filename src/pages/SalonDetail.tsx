import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Heart, Share2, 
  ChevronRight, Calendar, Check, User, MessageSquare, CreditCard 
} from 'lucide-react';
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
      { id: 1, name: "Haircut & Styling", duration: "45 min", price: 800, category: "Hair" },
      { id: 2, name: "Hair Coloring", duration: "2 hrs", price: 3500, category: "Hair" },
      { id: 3, name: "Keratin Treatment", duration: "3 hrs", price: 8000, category: "Hair" },
      { id: 4, name: "Bridal Makeup", duration: "2 hrs", price: 15000, category: "Makeup" },
      { id: 5, name: "Party Makeup", duration: "1 hr", price: 3000, category: "Makeup" },
      { id: 6, name: "Full Body Massage", duration: "1.5 hrs", price: 4000, category: "Spa" },
      { id: 7, name: "Facial Treatment", duration: "1 hr", price: 2500, category: "Spa" },
      { id: 8, name: "Manicure & Pedicure", duration: "1.5 hrs", price: 1500, category: "Nails" },
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
      { id: 1, name: "Classic Facial", duration: "1 hr", price: 1500, category: "Skincare" },
      { id: 2, name: "Gold Facial", duration: "1.5 hrs", price: 3000, category: "Skincare" },
      { id: 3, name: "Chemical Peel", duration: "45 min", price: 4000, category: "Skincare" },
      { id: 4, name: "Full Body Waxing", duration: "1.5 hrs", price: 2500, category: "Waxing" },
      { id: 5, name: "Threading", duration: "15 min", price: 200, category: "Threading" },
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
      { id: 1, name: "Men's Haircut", duration: "30 min", price: 600, category: "Haircut" },
      { id: 2, name: "Women's Haircut", duration: "45 min", price: 1000, category: "Haircut" },
      { id: 3, name: "Balayage", duration: "3 hrs", price: 8000, category: "Color" },
      { id: 4, name: "Highlights", duration: "2 hrs", price: 5000, category: "Color" },
      { id: 5, name: "Hair Spa", duration: "1 hr", price: 2000, category: "Treatment" },
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
      { id: 1, name: "Swedish Massage", duration: "1 hr", price: 3500, category: "Massage" },
      { id: 2, name: "Deep Tissue Massage", duration: "1 hr", price: 4000, category: "Massage" },
      { id: 3, name: "Hot Stone Therapy", duration: "1.5 hrs", price: 5500, category: "Massage" },
      { id: 4, name: "Body Wrap", duration: "1 hr", price: 4500, category: "Body" },
      { id: 5, name: "Aromatherapy", duration: "1.5 hrs", price: 5000, category: "Aromatherapy" },
    ],
    amenities: ["AC", "WiFi", "Parking", "Card Payment", "Locker Room", "Steam Room"],
    reviewsList: [
      { id: 1, name: "Kavya Singh", avatar: null, rating: 5, date: "2024-01-16", comment: "The hot stone therapy was heavenly! Best spa experience in Mumbai." },
      { id: 2, name: "Aisha Khan", avatar: null, rating: 5, date: "2024-01-11", comment: "Absolutely divine! The ambiance is so peaceful and the therapists are experts." },
      { id: 3, name: "Pooja Reddy", avatar: null, rating: 4, date: "2024-01-06", comment: "Great spa with professional staff. The steam room is a nice touch." },
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
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'salon'>('online');

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
  const totalPrice = selectedServicesData.reduce((sum: number, s: any) => sum + s.price, 0);
  const totalDuration = selectedServicesData.reduce((sum: string, s: any) => {
    const match = s.duration.match(/(\d+\.?\d*)/);
    return match ? sum + parseFloat(match[0]) : sum;
  }, 0);

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
        setShowBookingModal(false);
        setSelectedServices([]);
        
        toast({
          title: 'Payment Successful!',
          description: 'Your booking has been confirmed.',
        });

        const params = new URLSearchParams({
          salon: salon.name,
          service: serviceNames,
          price: totalPrice.toString(),
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          paymentId: paymentResult.paymentId || '',
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
      // Pay at salon
      setIsBooking(false);
      setShowBookingModal(false);
      setSelectedServices([]);

      const params = new URLSearchParams({
        salon: salon.name,
        service: serviceNames,
        price: totalPrice.toString(),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
      });
      
      navigate(`/booking-confirmation?${params.toString()}`);
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
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="services">Services</TabsTrigger>
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
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">₹{totalPrice}</span>
            </div>
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
