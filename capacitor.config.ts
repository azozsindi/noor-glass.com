import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noorglass.inventory',
  appName: 'Noor Glass',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
