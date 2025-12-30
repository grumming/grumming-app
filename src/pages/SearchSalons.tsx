import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, Star, MapPin, SlidersHorizontal, X, Scissors, Clock, ChevronDown, ArrowUpDown, Loader2
} from 'lucide-react';
import BackToTop from '@/components/BackToTop';
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
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useLocation } from '@/contexts/LocationContext';
import { useSalons, DbSalon } from '@/hooks/useSalons';

interface SalonBasic {
  id: string | number;
  name: string;
  location: string;
  city: string;
  image: string;
}

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

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minutes !== '00' ? ':' + minutes : ''} ${ampm}`;
};

const SearchSalons = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high'>('rating');
  const searchInputRef = useRef<HTMLDivElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { selectedCity } = useLocation();
  const { salons: dbSalons, isLoading } = useSalons();

  // Filter suggestions based on search query
  const salonSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return dbSalons
      .filter(salon => 
        salon.name.toLowerCase().includes(query) ||
        salon.location.toLowerCase().includes(query) ||
        salon.city.toLowerCase().includes(query)
      )
      .slice(0, 6)
      .map(s => ({
        id: s.id,
        name: s.name,
        location: s.location,
        city: s.city,
        image: s.image_url || ''
      }));
  }, [searchQuery, dbSalons]);

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

  const filteredSalons = useMemo(() => {
    let filtered = dbSalons;
    
    // Filter by selected city - but if no matches, show all
    if (selectedCity) {
      const cityName = selectedCity.split(',')[0].trim().toLowerCase();
      const cityMatches = filtered.filter(salon => 
        salon.city.toLowerCase().includes(cityName) ||
        cityName.includes(salon.city.toLowerCase())
      );
      // Only apply city filter if there are matches, otherwise show all
      if (cityMatches.length > 0) {
        filtered = cityMatches;
      }
    }
    
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(salon =>
        salon.name.toLowerCase().includes(query) ||
        salon.location.toLowerCase().includes(query) ||
        salon.city.toLowerCase().includes(query)
      );
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter(salon => (salon.rating || 0) >= minRating);
    }

    // Sort results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price_low':
          return 0; // Would need price data
        case 'price_high':
          return 0; // Would need price data
        default:
          return 0;
      }
    });
  }, [searchQuery, selectedCategories, minRating, dbSalons, sortBy, selectedCity]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

        {/* Quick Filters */}
        <div className="px-4 pb-3 flex items-center gap-2 border-b border-border">
          {/* Rating Dropdown */}
          <div className="relative group">
            <Button
              variant={minRating > 0 ? "default" : "outline"}
              size="sm"
              className="gap-1.5 h-9 px-3 rounded-full"
            >
              <Star className="w-3.5 h-3.5" />
              {minRating === 0 ? 'Rating' : `${minRating}+`}
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
            </Button>
            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 min-w-32 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2 space-y-1">
                {[0, 3.5, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      minRating === rating 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {rating === 0 ? 'Any rating' : (
                      <>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {rating}+ stars
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="relative group ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 px-3 rounded-full"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
            </Button>
            <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-xl shadow-lg z-50 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2 space-y-1">
                {[
                  { value: 'rating' as const, label: 'Rating' },
                  { value: 'price_low' as const, label: 'Price: Low to High' },
                  { value: 'price_high' as const, label: 'Price: High to Low' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      sortBy === option.value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Clear Filters */}
          {(minRating > 0 || selectedCategories.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

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
          {filteredSalons.length} salon{filteredSalons.length !== 1 ? 's' : ''} found
          {selectedCity && ` in ${selectedCity.split(',')[0]}`}
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
                        src={salon.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400"}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="flex-1 p-3">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold line-clamp-1">{salon.name}</h3>
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-xs">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span className="font-medium text-primary">{salon.rating?.toFixed(1) || '4.5'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" />
                        <span>{salon.location}, {salon.city}</span>
                      </div>
                      
                      {salon.opening_time && salon.closing_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(salon.opening_time)} - {formatTime(salon.closing_time)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {salon.total_reviews || 0} reviews
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
      <BackToTop />
    </div>
  );
};

export default SearchSalons;