'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  UserCheck,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';

export type NavIconKey =
  | 'home'
  | 'calendar'
  | 'classes'
  | 'finance'
  | 'reports'
  | 'notifications'
  | 'courts'
  | 'coaches'
  | 'students'
  | 'members'
  | 'profile';

function NavIcon({ icon }: { icon?: NavIconKey }) {
  const props = { size: 17, 'aria-hidden': true as const, className: 'club-nav-icon' };
  switch (icon) {
    case 'home': return <LayoutDashboard {...props} />;
    case 'calendar': return <CalendarDays {...props} />;
    case 'classes': return <GraduationCap {...props} />;
    case 'finance': return <Wallet {...props} />;
    case 'reports': return <BarChart3 {...props} />;
    case 'notifications': return <Bell {...props} />;
    case 'courts': return <MapPin {...props} />;
    case 'coaches': return <UserCheck {...props} />;
    case 'students': return <Users {...props} />;
    case 'members': return <ShieldCheck {...props} />;
    case 'profile': return <UserCircle {...props} />;
    default: return null;
  }
}

export function ClubNav({ links }: { links: { href: string; label: string; icon?: NavIconKey }[] }) {
  const pathname = usePathname();
  const home = links[0]?.href;
  const current = links
    .filter(({ href }) => pathname === href || (href !== home && pathname.startsWith(href + '/')))
    .reduce<string | undefined>((match, { href }) => (!match || href.length > match.length ? href : match), undefined);

  return (
    <nav className="club-nav" aria-label="ناوبری باشگاه">
      {links.map(({ href, label, icon }) => {
        const active = current === href;
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'club-nav-link is-active' : 'club-nav-link'}
            aria-current={active ? 'page' : undefined}
            onClick={() => window.dispatchEvent(new CustomEvent('sam:close-club-drawer'))}
          >
            <NavIcon icon={icon} />
            <span className="club-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
