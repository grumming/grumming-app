import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, MapPin, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import BottomNav from '@/components/BottomNav';

// Simplified salon data for favorites display
const salonsData: Record<string, { id: number; name: string; image: string; rating: number; reviews: number; location: string; price: number; isOpen: boolean }> = {
  '1': { id: 1, name: "Luxe Beauty Lounge", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80", rating: 4.9, reviews: 324, location: "Bandra West, Mumbai", price: 49, isOpen: true },
  '2': { id: 2, name: "Glow Studio", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80", rating: 4.8, reviews: 256, location: "Andheri East, Mumbai", price: 49, isOpen: true },
  '3': { id: 3, name: "The Hair Bar", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80", rating: 4.7, reviews: 189, location: "Juhu, Mumbai", price: 49, isOpen: true },
  '4': { id: 4, name: "Serenity Spa", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80", rating: 4.9, reviews: 412, location: "Powai, Mumbai", price: 49, isOpen: true },
  '5': { id: 5, name: "Royal Cuts Salon", image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80", rating: 4.7, reviews: 289, location: "Boring Road, Patna", price: 150, isOpen: true },
  '6': { id: 6, name: "Glamour Zone", image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80", rating: 4.8, reviews: 356, location: "Fraser Road, Patna", price: 2000, isOpen: true },
  '7': { id: 7, name: "Style Studio Patna", image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&auto=format&fit=crop&q=80", rating: 4.5, reviews: 178, location: "Kankarbagh, Patna", price: 200, isOpen: true },
  '8': { id: 8, name: "Buddha Beauty Parlour", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80", rating: 4.6, reviews: 145, location: "Bodhgaya Road, Gaya", price: 180, isOpen: true },
  '9': { id: 9, name: "Gaya Men's Salon", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80", rating: 4.4, reviews: 98, location: "Station Road, Gaya", price: 100, isOpen: true },
  '10': { id: 10, name: "Lichi City Salon", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80", rating: 4.7, reviews: 234, location: "Saraiya Ganj, Muzaffarpur", price: 300, isOpen: true },
  '11': { id: 11, name: "New Look Unisex Salon", image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&auto=format&fit=crop&q=80", rating: 4.3, reviews: 156, location: "Mithanpura, Muzaffarpur", price: 120, isOpen: true },
  '12': { id: 12, name: "Silk City Beauty Hub", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80", rating: 4.6, reviews: 189, location: "Khalifabagh, Bhagalpur", price: 250, isOpen: true },
  '13': { id: 13, name: "Trendy Looks Bhagalpur", image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=80", rating: 4.4, reviews: 112, location: "Adampur, Bhagalpur", price: 80, isOpen: true },
  '14': { id: 14, name: "The Grooming Lounge", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80", rating: 4.8, reviews: 267, location: "Patliputra Colony, Patna", price: 350, isOpen: true },
  '15': { id: 15, name: "Expert Hair and Skin Salon", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80", rating: 4.8, reviews: 156, location: "Main Road, Chakia", price: 100, isOpen: true },
};

const FavoriteSalons = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favoritesLoading, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const favoriteSalons = favorites
    .map((id) => salonsData[id])
    .filter(Boolean);

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Favorite Salons</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {favoriteSalons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">No favorites yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Tap the heart icon on any salon to save it here
              </p>
              <Button onClick={() => navigate('/')}>Explore Salons</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {favoriteSalons.map((salon, index) => (
              <motion.div
                key={salon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/salon/${salon.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-28 h-28 shrink-0">
                        <img
                          src={salon.image}
                          alt={salon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {salon.name}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{salon.location}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 -mt-1 -mr-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(salon.id.toString());
                            }}
                          >
                            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {salon.rating}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({salon.reviews})
                            </span>
                          </div>
                          {salon.isOpen && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">Open</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-primary font-medium mt-1">
                          From ₹{salon.price}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FavoriteSalons;
