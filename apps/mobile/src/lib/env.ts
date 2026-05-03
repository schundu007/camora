import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const LUMORA_API_URL =
  process.env.EXPO_PUBLIC_LUMORA_API_URL || extra.lumoraApiUrl || 'https://lumorab.cariara.com';

export const CAPRA_API_URL =
  process.env.EXPO_PUBLIC_CAPRA_API_URL || extra.capraApiUrl || 'https://caprab.cariara.com';

export const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL || extra.webAppUrl || 'https://camora.cariara.com';
