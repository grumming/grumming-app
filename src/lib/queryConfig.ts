// Centralized React Query configuration for consistent caching
export const queryConfig = {
  // Stale times (data considered fresh for this duration)
  staleTime: {
    salons: 1000 * 60 * 10, // 10 minutes - salons rarely change
    salonById: 1000 * 60 * 5, // 5 minutes - individual salon details
    services: 1000 * 60 * 10, // 10 minutes - services rarely change
    profile: 1000 * 60 * 5, // 5 minutes - user profile
    wallet: 1000 * 60 * 5, // 5 minutes - wallet balance
    bookings: 1000 * 60 * 2, // 2 minutes - bookings change more often
    favorites: 1000 * 60 * 5, // 5 minutes - favorites
    notifications: 1000 * 60 * 1, // 1 minute - notifications are time-sensitive
  },
  
  // Garbage collection times (data kept in cache for this duration)
  gcTime: {
    default: 1000 * 60 * 30, // 30 minutes default
    salons: 1000 * 60 * 60, // 1 hour - keep salons longer
  },
} as const;

// Query keys for consistent key management
export const queryKeys = {
  salons: {
    all: ['salons'] as const,
    byCity: (city: string | null) => ['salons', 'city', city] as const,
    byId: (id: string) => ['salons', 'detail', id] as const,
    services: (salonId: string) => ['salons', 'services', salonId] as const,
    search: (query: string) => ['salons', 'search', query] as const,
  },
  wallet: {
    balance: (userId: string) => ['wallet', userId] as const,
    transactions: (userId: string) => ['wallet-transactions', userId] as const,
  },
  bookings: {
    all: (userId: string) => ['bookings', userId] as const,
    byId: (id: string) => ['bookings', 'detail', id] as const,
  },
  favorites: {
    all: (userId: string) => ['favorites', userId] as const,
  },
  profile: {
    byId: (userId: string) => ['profile', userId] as const,
  },
} as const;
