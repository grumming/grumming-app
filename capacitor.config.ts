import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ff282e2699504fd996b5aab282c6315c',
  appName: 'grummingcom',
  webDir: 'dist',
  server: {
    url: 'https://ff282e26-9950-4fd9-96b5-aab282c6315c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      androidPermissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
    },
    Geolocation: {
      androidPermissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION']
    }
  }
};

export default config;
