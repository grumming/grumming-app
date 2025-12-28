import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, Star, MapPin, SlidersHorizontal, X, Scissors, Clock, Car 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getFilteredSalons, SalonBasic } from '@/data/salonsData';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useLocation } from '@/contexts/LocationContext';
import { calculateDistance, formatDistance, estimateTravelTime } from '@/lib/distance';
import { salonsData } from '@/components/FeaturedSalons';
interface Salon {
  id: number;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  location: string;
  city: string;
  services: string[];
  price: string;
  priceValue: number;
  categories: string[];
}

const allSalons: Salon[] = [
  {
    id: 1,
    name: "Luxe Beauty Lounge",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
    rating: 4.9,
    reviews: 324,
    location: "Bandra West",
    city: "Mumbai",
    services: ["Haircut", "Styling", "Color", "Keratin"],
    price: "₹800",
    priceValue: 800,
    categories: ["Hair", "Makeup", "Spa"],
  },
  {
    id: 2,
    name: "Glow Studio",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
    rating: 4.8,
    reviews: 256,
    location: "Andheri East",
    city: "Mumbai",
    services: ["Facial", "Waxing", "Threading"],
    price: "₹500",
    priceValue: 500,
    categories: ["Skincare", "Waxing"],
  },
  {
    id: 3,
    name: "The Hair Bar",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400",
    rating: 4.7,
    reviews: 189,
    location: "Juhu",
    city: "Mumbai",
    services: ["Haircut", "Balayage", "Highlights"],
    price: "₹600",
    priceValue: 600,
    categories: ["Hair", "Color"],
  },
  {
    id: 4,
    name: "Serenity Spa",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400",
    rating: 4.9,
    reviews: 412,
    location: "Powai",
    city: "Mumbai",
    services: ["Massage", "Body Wrap", "Aromatherapy"],
    price: "₹3500",
    priceValue: 3500,
    categories: ["Spa", "Massage"],
  },
  {
    id: 5,
    name: "Style Studio",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400",
    rating: 4.8,
    reviews: 234,
    location: "Connaught Place",
    city: "Delhi",
    services: ["Haircut", "Styling", "Color"],
    price: "₹500",
    priceValue: 500,
    categories: ["Hair"],
  },
  {
    id: 6,
    name: "The Barber Shop",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
    rating: 4.9,
    reviews: 189,
    location: "Bandra West",
    city: "Mumbai",
    services: ["Beard Trim", "Haircut", "Shave"],
    price: "₹400",
    priceValue: 400,
    categories: ["Hair", "Beard"],
  },
  {
    id: 7,
    name: "Glamour Hair Salon",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
    rating: 4.7,
    reviews: 312,
    location: "Koramangala",
    city: "Bangalore",
    services: ["Hair Spa", "Keratin", "Highlights"],
    price: "₹800",
    priceValue: 800,
    categories: ["Hair", "Treatment"],
  },
  {
    id: 8,
    name: "Urban Cuts",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400",
    rating: 4.6,
    reviews: 156,
    location: "Anna Nagar",
    city: "Chennai",
    services: ["Haircut", "Facial", "Massage"],
    price: "₹350",
    priceValue: 350,
    categories: ["Hair", "Skincare"],
  },
];

const serviceCategories = [
  "Hair",
  "Beard",
  "Skincare",
  "Makeup",
  "Spa",
  "Massage",
  "Waxing",
  "Nails",
];

const SearchSalons = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const isNearbyMode = searchParams.get('nearby') === 'true';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [salonSuggestions, setSalonSuggestions] = useState<SalonBasic[]>([]);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { coordinates } = useLocation();

  useEffect(() => {
    const filtered = getFilteredSalons(searchQuery);
    setSalonSuggestions(filtered);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectSalon = (salon: SalonBasic) => {
    addRecentSearch(salon);
    setShowSuggestions(false);
    navigate(`/salon/${salon.id}`);
  };

  // Nearby salons sorted by distance
  const nearbySalons = useMemo(() => {
    if (!coordinates) return [];
    
    return salonsData
      .map(salon => ({
        id: salon.id,
        name: salon.name,
        image: salon.image,
        rating: salon.rating,
        reviews: salon.reviews,
        location: salon.location,
        city: salon.city,
        services: salon.services,
        price: salon.price,
        priceValue: salon.price === "₹₹₹" ? 800 : salon.price === "₹₹" ? 500 : 300,
        categories: salon.services,
        distance: calculateDistance(
          coordinates.lat,
          coordinates.lng,
          salon.coordinates.lat,
          salon.coordinates.lng
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [coordinates]);

  const filteredSalons = useMemo(() => {
    const baseSalons = isNearbyMode && coordinates ? nearbySalons : allSalons.map(s => ({ ...s, distance: null as number | null }));
    
    return baseSalons.filter(salon => {
      // Search query filter
      const matchesSearch = 
        searchQuery === '' ||
        salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        salon.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        salon.city.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = 
        selectedCategories.length === 0 ||
        salon.categories.some(c => selectedCategories.includes(c));

      // Price filter
      const matchesPrice = 
        salon.priceValue >= priceRange[0] && salon.priceValue <= priceRange[1];

      // Rating filter
      const matchesRating = salon.rating >= minRating;

      return matchesSearch && matchesCategory && matchesPrice && matchesRating;
    });
  }, [searchQuery, selectedCategories, priceRange, minRating, isNearbyMode, coordinates, nearbySalons]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 10000]);
    setMinRating(0);
  };

  const activeFiltersCount = 
    selectedCategories.length + 
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) + 
    (minRating > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div ref={searchInputRef} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search salons, services..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10 h-10"
            />
            
            {/* Salon Suggestions Dropdown */}
            {showSuggestions && (salonSuggestions.length > 0 || (searchQuery === '' && recentSearches.length > 0)) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
                {/* Recent Searches */}
                {searchQuery === '' && recentSearches.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center justify-between border-b border-border">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearches();
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((salon) => (
                      <button
                        key={salon.id}
                        onClick={() => handleSelectSalon(salon)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-foreground font-medium">{salon.name}</p>
                          <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {/* Search Suggestions */}
                {salonSuggestions.map((salon) => (
                  <button
                    key={salon.id}
                    onClick={() => handleSelectSalon(salon)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <Scissors className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-foreground font-medium">{salon.name}</p>
                      <p className="text-xs text-muted-foreground">{salon.location}, {salon.city}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  Filters
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Service Categories */}
                <div>
                  <h3 className="font-semibold mb-3">Service Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {serviceCategories.map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategories.includes(category) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold mb-3">Price Range</h3>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => setPriceRange(value as [number, number])}
                      min={0}
                      max={10000}
                      step={100}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>₹{priceRange[0]}</span>
                      <span>₹{priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div>
                  <h3 className="font-semibold mb-3">Minimum Rating</h3>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5].map((rating) => (
                      <Button
                        key={rating}
                        variant={minRating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMinRating(rating)}
                        className="gap-1"
                      >
                        {rating === 0 ? 'Any' : (
                          <>
                            <Star className="w-3 h-3 fill-current" />
                            {rating}+
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => setIsFilterOpen(false)}
                >
                  Show {filteredSalons.length} Results
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick Filters for Nearby Mode */}
        {isNearbyMode && coordinates && (
          <div className="px-4 pb-3 space-y-2 border-b border-border">
            {/* Rating Quick Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 flex-shrink-0">Rating:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 3.5, 4, 4.5].map((rating) => (
                  <Button
                    key={rating}
                    variant={minRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinRating(rating)}
                    className={`gap-1 h-8 px-3 text-xs rounded-full transition-all ${
                      minRating === rating 
                        ? 'shadow-sm' 
                        : 'hover:bg-primary/10 hover:border-primary/50'
                    }`}
                  >
                    {rating === 0 ? 'Any' : (
                      <>
                        <Star className="w-3 h-3 fill-current" />
                        {rating}+
                      </>
                    )}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Service Type Quick Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 flex-shrink-0">Services:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {serviceCategories.slice(0, 6).map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1 rounded-full transition-all ${
                      selectedCategories.includes(category)
                        ? 'shadow-sm'
                        : 'hover:bg-primary/10 hover:border-primary/50'
                    }`}
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge key={category} variant="secondary" className="gap-1">
                {category}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => toggleCategory(category)}
                />
              </Badge>
            ))}
            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
              <Badge variant="secondary" className="gap-1">
                ₹{priceRange[0]} - ₹{priceRange[1]}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setPriceRange([0, 10000])}
                />
              </Badge>
            )}
            {minRating > 0 && (
              <Badge variant="secondary" className="gap-1">
                {minRating}+ ★
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setMinRating(0)}
                />
              </Badge>
            )}
          </div>
        )}
      </header>

      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">
          {isNearbyMode && coordinates 
            ? `${filteredSalons.length} nearby salon${filteredSalons.length !== 1 ? 's' : ''} sorted by distance`
            : `${filteredSalons.length} salon${filteredSalons.length !== 1 ? 's' : ''} found`
          }
        </p>

        {filteredSalons.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No salons found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSalons.map((salon, index) => (
              <motion.div
                key={salon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/salon/${salon.id}`)}
                >
                  <div className="flex">
                    <div className="w-32 h-32 flex-shrink-0">
                      <img
                        src={salon.image}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="flex-1 p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold line-clamp-1">{salon.name}</h3>
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-xs">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span className="font-medium text-primary">{salon.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" />
                        <span>{salon.location}, {salon.city}</span>
                        {salon.distance !== null && (
                          <span className="ml-auto text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {formatDistance(salon.distance)}
                          </span>
                        )}
                      </div>
                      
                      {salon.distance !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Car className="w-3 h-3" />
                          <span>{estimateTravelTime(salon.distance).driving} drive</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-2">
                        {salon.services.slice(0, 3).map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs py-0">
                            {service}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">
                          {salon.price}+
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {salon.reviews} reviews
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchSalons;
