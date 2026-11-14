import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { clubFor, displayName } from '@/lib/club';
import { roles } from '@/lib/roles';
import { resourcePath } from '@/lib/resource-fields';
import { currentUser } from '@/lib/session';
import { ClubSidebarShell } from '@/components/club-sidebar-shell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Brand, Logout } from '../../ui';
import { ClubPageMotion } from '../../motion-ui';
import { ClubNav, type NavIconKey } from './nav';
import { ClubSearch } from './search';

export const dynamic = 'force-dynamic';

export default async function ClubLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const user = await currentUser();
  if (!user) redirect('/');
  const club = await clubFor(user.id, org);
  if (!club) notFound();
  const name = await displayName(user.id);
  const links: Array<{ href: string; label: string; icon: NavIconKey }> = [
    { href: `/club/${org}`, label: 'نمای کلی', icon: 'home' },
    { href: `/club/${org}/calendar`, label: 'تقویم سانس‌ها', icon: 'calendar' },
    { href: `/club/${org}/classes`, label: 'کلاس‌ها و حضور', icon: 'classes' },
    { href: `/club/${org}/finance`, label: 'امور مالی', icon: 'finance' },
    { href: `/club/${org}/reports`, label: 'گزارش‌ها', icon: 'reports' },
    { href: `/club/${org}/notifications`, label: 'اعلان‌ها', icon: 'notifications' },
    { href: resourcePath(org, 'courts'), label: 'زمین‌ها', icon: 'courts' },
    { href: resourcePath(org, 'coaches'), label: 'مربیان', icon: 'coaches' },
    { href: resourcePath(org, 'students'), label: 'شاگردان', icon: 'students' },
    ...(club.role === 'owner' ? [{ href: `/club/${org}/members`, label: 'مدیران و دسترسی', icon: 'members' as const }] : []),
    { href: `/club/${org}/profile`, label: 'پروفایل من', icon: 'profile' },
  ];
  return (
    <div className="local-shell">
      <ClubSidebarShell brand={<Brand href={`/club/${org}`} />}>
        <ClubSearch org={org} />
        <ClubNav links={links} />
        <div className="local-sidebar-footer">
          <ThemeToggle />
          <div className="local-account">
            <div>
              <strong>{name || 'حساب باشگاه'}</strong>
              <small>{roles[club.role]}</small>
            </div>
            <Logout />
          </div>
        </div>
      </ClubSidebarShell>
      <main className="local-content">
        <ClubPageMotion>{children}</ClubPageMotion>
      </main>
    </div>
  );
}
