import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { NAV_ITEMS } from '@/components/dashboard/nav-config';
import { TeacherSubjectsCard } from '@/components/dashboard/teacher-subjects-card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardHomePage() {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) {
    return null;
  }
  const user = session.user;
  const quickLinks = NAV_ITEMS.filter(
    (item) => item.href !== '/' && item.roles.includes(user.role),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.welcome', { name: user.firstName })}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {user.role === 'TEACHER' ? <TeacherSubjectsCard /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Card className="hover:border-primary h-full transition-colors">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{t(`nav.${item.labelKey}`)}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
