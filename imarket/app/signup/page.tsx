import { getTranslations } from 'next-intl/server';
import SignupForm from '@/components/auth/SignupForm';

export default async function SignupPage() {
  const t = await getTranslations('auth');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-foreground">
            i<span className="text-primary">Market</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('signupSubtitle')}</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
