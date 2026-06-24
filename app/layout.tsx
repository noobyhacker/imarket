import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { isMaintenanceMode } from '@/lib/featureFlags';
import { getAdminContext } from '@/lib/adminAuth';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'iMarket — Buy & Sell in Korea',
  description: 'The foreigner-friendly marketplace in Korea',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Maintenance mode blocks everyone except admins.
  const maintenance = await isMaintenanceMode();
  const admin = maintenance ? await getAdminContext().catch(() => null) : null;
  const showMaintenance = maintenance && !admin;
  const tm = showMaintenance ? await getTranslations('maintenance') : null;

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {showMaintenance && tm ? (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
              <h1 className="text-2xl font-bold text-foreground">{tm('title')}</h1>
              <p className="max-w-md text-sm text-muted-foreground">{tm('body')}</p>
            </div>
          ) : (
            children
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
