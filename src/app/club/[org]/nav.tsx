'use client';
import Link from 'next/link';
import { MotionConfig, motion } from 'motion/react';
import { usePathname } from 'next/navigation';

export function ClubNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const home = links[0]?.href;
  const current = links
    .filter(({ href }) => pathname === href || (href !== home && pathname.startsWith(href + '/')))
    .reduce<string | undefined>((match, { href }) => (!match || href.length > match.length ? href : match), undefined);

  return (
    <MotionConfig reducedMotion="user">
      <nav className="club-nav" aria-label="ناوبری باشگاه">
        {links.map(({ href, label }) => {
          const active = current === href;
          return (
            <Link
              key={href}
              href={href}
              className="club-nav-link"
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="club-nav-pill"
                  className="club-nav-pill"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="club-nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
