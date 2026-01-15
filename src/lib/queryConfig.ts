// Centralized React Query configuration for consistent caching across the app

export const QUERY_STALE_TIMES = {
  // User-related data - cached longer as it changes infrequently
  userData: 5 * 60 * 1000,      // 5 minutes
  userProfile: 5 * 60 * 1000,   // 5 minutes
  
  // Favorites - moderate cache time
  favorites: 5 * 60 * 1000,     // 5 minutes
  
  // Penalties - shorter cache as they can change after payments
  penalties: 2 * 60 * 1000,     // 2 minutes
  
  // Salon data - longer cache as it's mostly static
  salons: 10 * 60 * 1000,       // 10 minutes
  salonServices: 10 * 60 * 1000, // 10 minutes
  
  // Notifications - very short cache for real-time feel
  notifications: 30 * 1000,     // 30 seconds
  
  // Wallet - moderate cache
  wallet: 5 * 60 * 1000,        // 5 minutes
  
  // Bookings - shorter cache as status changes
  bookings: 2 * 60 * 1000,      // 2 minutes
} as const;

export const QUERY_GC_TIMES = {
  default: 10 * 60 * 1000,      // 10 minutes
  userRelated: 15 * 60 * 1000,  // 15 minutes
} as const;

// Query keys for consistent cache management
export const QUERY_KEYS = {
  userData: (userId: string | undefined) => ['user-data', userId] as const,
  favorites: (userId: string | undefined) => ['favorites', userId] as const,
  penalties: (userId: string | undefined) => ['pending-penalties', userId] as const,
  notifications: (userId: string | undefined) => ['notifications', userId] as const,
  wallet: (userId: string | undefined) => ['wallet', userId] as const,
  salons: () => ['salons'] as const,
  salonDetail: (salonId: string) => ['salon', salonId] as const,
} as const;
