import { getTranslations } from 'next-intl/server';
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const t = await getTranslations('auth');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-foreground">
            <span className="text-primary">i</span>Market
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        <LoginForm redirect={searchParams.redirect} />
      </div>
    </div>
  );
}
