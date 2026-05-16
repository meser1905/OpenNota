import { GraduationCap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage() {
  const t = await getTranslations();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-3 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex h-12 w-12 items-center justify-center rounded-xl">
          <GraduationCap className="size-6" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">{t('app.name')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
