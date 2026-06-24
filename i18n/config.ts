import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'ko', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

export default getRequestConfig(async () => {
  // 1. Cookie preference
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  
  // 2. Accept-Language header
  const headersList = headers();
  const acceptLanguage = headersList.get('accept-language') ?? '';
  const browserLocale = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();

  let locale: Locale = defaultLocale;

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else if (browserLocale && locales.includes(browserLocale as Locale)) {
    locale = browserLocale as Locale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
