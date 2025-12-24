import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LocationContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCity] = useState<string>('');

  return (
    <LocationContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
