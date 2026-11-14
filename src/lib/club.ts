import 'server-only';
import { isDemoMode } from './config';
import { asUser } from './db';
import { demoBranches, demoClubs, demoCurrency, demoDisplayName, demoMembers, demoOverviewCounts } from './demo-store';
import type { ClubRole } from './roles';

export type Club = { id: string; name: string; role: ClubRole };
export type Branch = { id: string; name: string; timezone: string; active: boolean };
export type Member = {
  user_id: string; email: string | null; display_name: string | null; role: ClubRole;
  active: boolean; location_ids: string[];
};
export const uuid = (id: string) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);

export async function clubs(userId: string): Promise<Club[]> {
  if (isDemoMode()) return demoClubs(userId);
  return asUser(userId, async db => (await db.query<Club>(`
    select o.id,o.name,m.role from public.organizations as o
    join public.organization_members as m on m.organization_id=o.id
    where m.user_id=$1 and m.active and m.role in ('owner','admin') order by o.name,o.id`, [userId])).rows);
}

export async function clubFor(userId: string, org: string): Promise<Club | null> {
  if (!uuid(org)) return null;
  return (await clubs(userId)).find(club => club.id === org) ?? null;
}

export async function branches(userId: string, org: string): Promise<Branch[]> {
  if (isDemoMode()) return demoBranches(userId, org);
  return asUser(userId, async db => (await db.query<Branch>(
    'select id,name,timezone,active from public.locations where organization_id=$1 order by name', [org])).rows);
}

export async function members(userId: string, org: string): Promise<Member[]> {
  if (isDemoMode()) return demoMembers(userId, org);
  return asUser(userId, async db => (await db.query<Member>('select * from public.club_members($1)', [org])).rows);
}

export async function displayName(userId: string): Promise<string> {
  if (isDemoMode()) return demoDisplayName(userId);
  return asUser(userId, async db => (await db.query<{ display_name: string }>(
    'select display_name from public.profiles where user_id=$1', [userId])).rows[0]?.display_name ?? '');
}

export async function clubCurrency(userId: string, org: string): Promise<string | null> {
  if (isDemoMode()) return demoCurrency(org);
  return asUser(userId, async db => (await db.query<{ currency: string }>(
    'select currency from public.organizations where id=$1', [org])).rows[0]?.currency ?? null);
}

export async function clubOverviewCounts(userId: string, org: string) {
  if (isDemoMode()) return demoOverviewCounts(org);
  return asUser(userId, async db => (await db.query<{
    courts: number; bookings: number; coaches: number; students: number;
  }>(`select
    (select count(*)::int from public.courts where organization_id=$1 and status='active') as courts,
    (select count(*)::int from public.bookings where organization_id=$1 and status='confirmed' and starts_at>=now()) as bookings,
    (select count(*)::int from public.coach_profiles where organization_id=$1 and status='active') as coaches,
    (select count(*)::int from public.student_profiles where organization_id=$1 and status='active') as students`, [org])).rows[0]);
}
