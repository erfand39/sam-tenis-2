import 'server-only';
import { randomUUID } from 'node:crypto';
import { addDays, branchDateTime, calendarDateTime, calendarPath, validCalendarDate } from './calendar-dates';
import { attendanceStates, classesPath, type AttendanceState, type ClassState } from './class-fields';
import { uuid, type Branch, type Club, type Member } from './club';
import { coachBases, commandTab, expenseCategories, operationsPath, type ClubFinanceCommand, type payableStates } from './club-finance-fields';
import { financePath, paymentMethods, type FinanceCommandName, type InvoiceState } from './finance-fields';
import { InputError } from './input';
import { parseMinor } from './money';
import type { NoticeKind } from './notifications';
import type { DateRange, ReportScope } from './report-dates';
import type { ReportBooking, ReportData, ReportEntity, ReportSession } from './reports';
import { asciiDigits, bookingKinds, isResourceKind, resourceKinds, resourcePath, type ResourceKind, type ResourceSearchItem, type ResourceStatus } from './resource-fields';
import { normalizeSearchText } from './resource-search';
import type { ClubRole } from './roles';

export const DEMO_ORG_ID = '10000000-0000-4000-8000-000000000001';
export const DEMO_OWNER_ID = '10000000-0000-4000-8000-000000000099';
export const DEMO_ADMIN_ID = '10000000-0000-4000-8000-000000000098';
export const DEMO_BRANCH_1 = '10000000-0000-4000-8000-000000000011';
export const DEMO_BRANCH_2 = '10000000-0000-4000-8000-000000000012';

type DemoCourt = {
  id: string;
  location_id: string;
  name: string;
  surface: string;
  capacity: number;
  amenities: string[];
  notes: string | null;
  status: ResourceStatus;
  revision: number;
  updated_at: Date;
};

type DemoCoach = {
  id: string;
  name: string;
  specialty: string | null;
  qualification: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  joined_on: string | null;
  notes: string | null;
  pay_basis: 'hourly' | 'per_session' | null;
  pay_amount_minor: number | null;
  status: ResourceStatus;
  revision: number;
  updated_at: Date;
  locations: string[];
  court_ids: string[];
};

type DemoStudent = {
  id: string;
  name: string;
  skill_level: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  joined_on: string | null;
  created_at: Date;
  notes: string | null;
  status: ResourceStatus;
  revision: number;
  updated_at: Date;
  locations: string[];
  level_changes: Array<{ id: string; previous_level: string | null; current_level: string | null; effective_at: string }>;
};

type DemoHours = {
  id: string;
  kind: 'courts' | 'coaches';
  target_id: string;
  location_id: string;
  weekday: number;
  from_date: string;
  until_date: string | null;
  starts: number;
  ends: number;
};

type DemoRate = {
  id: string;
  location_id: string;
  court_id: string;
  kind: 'rental' | 'private' | 'group';
  from_time: Date;
  until_time: Date | null;
  unit_minutes: number;
  amount_minor: string;
};

type DemoSpecialRate = {
  id: string;
  location_id: string;
  rate_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
  min_minutes: number;
  max_minutes: number;
  amount: string;
  retired_at: Date | null;
};

type DemoBlock = {
  id: string;
  location_id: string;
  court_id: string;
  starts_at: Date;
  ends_at: Date;
  reason: string;
  released_at: Date | null;
};

type DemoBooking = {
  id: string;
  location_id: string;
  court_id: string;
  starts_at: Date;
  ends_at: Date;
  timezone: string;
  kind: 'rental' | 'private' | 'group';
  status: 'confirmed' | 'cancelled';
  booker_name: string | null;
  revision: number;
  amount_minor: string;
  currency: string;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  history: Array<{ action: string; created_at: Date; old_start: Date | null; new_start: Date | null }>;
};

type DemoSession = {
  id: string;
  booking_id: string;
  location_id: string;
  coach_id: string | null;
  status: ClassState;
  capacity: number;
  actual_start: Date | null;
  actual_end: Date | null;
  revision: number;
  history: Array<{ recorded_at: Date; actor: string | null; corrected: boolean; reason: string | null }>;
};

type DemoParticipant = {
  id: string;
  session_id: string;
  location_id: string;
  student_id: string;
  withdrawn_at: Date | null;
  attendance: AttendanceState | null;
};

type DemoInvoice = {
  id: string;
  location_id: string;
  invoice_number: string;
  issued_at: Date;
  currency: string;
  total_minor: bigint;
  discount_minor: bigint;
  discount_reason: string | null;
  voided_at: Date | null;
  void_reason: string | null;
};

type DemoInvoiceItem = {
  id: string;
  location_id: string;
  invoice_id: string;
  booking_id: string | null;
  package_id: string | null;
  amount_minor: bigint;
  active: boolean;
};

type DemoPayment = {
  id: string;
  location_id: string;
  invoice_id: string;
  amount_minor: bigint;
  method: keyof typeof paymentMethods;
  reference: string | null;
  effective_at: Date;
};

type DemoRefund = {
  id: string;
  location_id: string;
  payment_id: string;
  amount_minor: bigint;
  reason: string;
  effective_at: Date;
};

type DemoPackage = {
  id: string;
  location_id: string;
  student_id: string;
  title: string;
  sessions: number | null;
  valid_from: string;
  valid_until: string;
  status: 'active' | 'suspended' | 'cancelled';
  invoice_id: string | null;
  created_at: Date;
};

type DemoTrainingUse = {
  id: string;
  location_id: string;
  package_id: string;
  participant_id: string;
  session_id: string;
  used_at: Date;
  reversed_at: Date | null;
  reversal_reason: string | null;
};

type DemoExpense = {
  id: string;
  location_id: string;
  title: string;
  category: keyof typeof expenseCategories;
  currency: string;
  amount_minor: bigint;
  method: keyof typeof paymentMethods;
  effective_on: string;
  voided_at: Date | null;
  void_reason: string | null;
};

type DemoPayable = {
  id: string;
  location_id: string;
  session_id: string;
  currency: string;
  status: keyof typeof payableStates;
  amount_minor: bigint | null;
  basis_minor: bigint | null;
  basis: keyof typeof coachBases | null;
  rate: string | null;
  approved_at: Date | null;
  paid_at: Date | null;
  payment_method: keyof typeof paymentMethods | null;
  reference: string | null;
};

type DemoAdjustment = {
  id: string;
  location_id: string;
  payable_id: string;
  delta_minor: bigint;
  reason: string;
  effective_at: Date;
};

type DemoNotice = {
  id: string;
  kind: NoticeKind;
  source_id: string;
  location_id: string;
  available_at: Date;
};

type DemoResourceEvent = {
  kind: ResourceKind;
  target_id: string;
  occurred_at: Date;
  action: 'created' | 'edited' | 'archived' | 'hours' | 'rate';
  actor: string | null;
  previous_status: ResourceStatus | null;
  current_status: ResourceStatus | null;
};

type DemoStore = {
  org: { id: string; name: string; currency: string };
  branches: Branch[];
  profiles: Record<string, string>;
  members: Member[];
  courts: DemoCourt[];
  coaches: DemoCoach[];
  students: DemoStudent[];
  hours: DemoHours[];
  rates: DemoRate[];
  specials: DemoSpecialRate[];
  blocks: DemoBlock[];
  bookings: DemoBooking[];
  sessions: DemoSession[];
  participants: DemoParticipant[];
  invoices: DemoInvoice[];
  invoiceItems: DemoInvoiceItem[];
  payments: DemoPayment[];
  refunds: DemoRefund[];
  packages: DemoPackage[];
  trainingUses: DemoTrainingUse[];
  expenses: DemoExpense[];
  payables: DemoPayable[];
  adjustments: DemoAdjustment[];
  notices: DemoNotice[];
  readNoticeIds: Set<string>;
  resourceEvents: DemoResourceEvent[];
  nextInvoiceNumber: number;
};

function toBranchDate(localIso: string, timezone = 'Asia/Tehran'): Date {
  // Parse YYYY-MM-DDTHH:MM in branch local timezone
  const [d, hm] = localIso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = hm.split(':').map(Number);
  const approx = new Date(Date.UTC(y, m - 1, day, hh, mm));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(approx);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const renderedUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const targetUtc = Date.UTC(y, m - 1, day, hh, mm);
  return new Date(approx.getTime() + (targetUtc - renderedUtc));
}

function localDayOf(date: Date, timezone = 'Asia/Tehran'): string {
  return branchDateTime(timezone, date).date;
}

function localTimeOf(date: Date, timezone = 'Asia/Tehran'): string {
  return branchDateTime(timezone, date).hour;
}

function createInitialStore(): DemoStore {
  const today = branchDateTime('Asia/Tehran').date;
  const dMinus20 = addDays(today, -20);
  const dMinus10 = addDays(today, -10);
  const dMinus9 = addDays(today, -9);
  const dMinus5 = addDays(today, -5);
  const dMinus4 = addDays(today, -4);
  const dMinus3 = addDays(today, -3);
  const dMinus2 = addDays(today, -2);
  const dMinus1 = addDays(today, -1);
  const dPlus1 = addDays(today, 1);
  const dPlus2 = addDays(today, 2);
  const dPlus3 = addDays(today, 3);
  const dPlus25 = addDays(today, 25);

  const courtIds = [
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000024',
  ];
  const coachIds = [
    '10000000-0000-4000-8000-000000000031',
    '10000000-0000-4000-8000-000000000032',
    '10000000-0000-4000-8000-000000000033',
  ];
  const studentIds = [
    '10000000-0000-4000-8000-000000000041',
    '10000000-0000-4000-8000-000000000042',
    '10000000-0000-4000-8000-000000000043',
    '10000000-0000-4000-8000-000000000044',
    '10000000-0000-4000-8000-000000000045',
  ];
  const bookingIds = [
    '10000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000104',
    '10000000-0000-4000-8000-000000000105',
    '10000000-0000-4000-8000-000000000106',
    '10000000-0000-4000-8000-000000000107',
    '10000000-0000-4000-8000-000000000108',
  ];
  const sessionIds = [
    '10000000-0000-4000-8000-000000000201',
    '10000000-0000-4000-8000-000000000202',
    '10000000-0000-4000-8000-000000000203',
    '10000000-0000-4000-8000-000000000204',
    '10000000-0000-4000-8000-000000000205',
    '10000000-0000-4000-8000-000000000207',
  ];
  const invoiceIds = [
    '10000000-0000-4000-8000-000000000301',
    '10000000-0000-4000-8000-000000000302',
    '10000000-0000-4000-8000-000000000303',
    '10000000-0000-4000-8000-000000000304',
  ];
  const pkgIds = [
    '10000000-0000-4000-8000-000000000401',
    '10000000-0000-4000-8000-000000000402',
  ];

  const hours: DemoHours[] = [];
  for (const c of [
    { id: courtIds[0], loc: DEMO_BRANCH_1 },
    { id: courtIds[1], loc: DEMO_BRANCH_1 },
    { id: courtIds[2], loc: DEMO_BRANCH_1 },
    { id: courtIds[3], loc: DEMO_BRANCH_2 },
  ]) {
    for (let weekday = 1; weekday <= 7; weekday++) {
      hours.push({
        id: randomUUID(),
        kind: 'courts',
        target_id: c.id,
        location_id: c.loc,
        weekday,
        from_date: dMinus20,
        until_date: null,
        starts: 480,
        ends: 1320,
      });
    }
  }
  for (const ch of [
    { id: coachIds[0], locs: [DEMO_BRANCH_1, DEMO_BRANCH_2] },
    { id: coachIds[1], locs: [DEMO_BRANCH_1, DEMO_BRANCH_2] },
    { id: coachIds[2], locs: [DEMO_BRANCH_1] },
  ]) {
    for (const loc of ch.locs) {
      for (let weekday = 1; weekday <= 7; weekday++) {
        hours.push({
          id: randomUUID(),
          kind: 'coaches',
          target_id: ch.id,
          location_id: loc,
          weekday,
          from_date: dMinus20,
          until_date: null,
          starts: 480,
          ends: 1260,
        });
      }
    }
  }

  const rates: DemoRate[] = [];
  for (const c of [
    { id: courtIds[0], loc: DEMO_BRANCH_1 },
    { id: courtIds[1], loc: DEMO_BRANCH_1 },
    { id: courtIds[2], loc: DEMO_BRANCH_1 },
    { id: courtIds[3], loc: DEMO_BRANCH_2 },
  ]) {
    for (const [kind, amt] of [
      ['rental', '1800000'],
      ['private', '3400000'],
      ['group', '2600000'],
    ] as const) {
      rates.push({
        id: randomUUID(),
        location_id: c.loc,
        court_id: c.id,
        kind,
        from_time: toBranchDate(`${dMinus20}T00:00`),
        until_time: null,
        unit_minutes: 30,
        amount_minor: amt,
      });
    }
  }

  const specials: DemoSpecialRate[] = [
    {
      id: '10000000-0000-4000-8000-000000000501',
      location_id: DEMO_BRANCH_1,
      rate_id: rates[0].id,
      weekday: 5,
      start_minute: 1020,
      end_minute: 1260,
      min_minutes: 60,
      max_minutes: 180,
      amount: '2200000',
      retired_at: null,
    },
  ];

  const bookings: DemoBooking[] = [
    {
      id: bookingIds[0],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[0],
      starts_at: toBranchDate(`${dMinus4}T10:00`),
      ends_at: toBranchDate(`${dMinus4}T11:00`),
      timezone: 'Asia/Tehran',
      kind: 'private',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '6800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${dMinus5}T14:20`), old_start: null, new_start: toBranchDate(`${dMinus4}T10:00`) }],
    },
    {
      id: bookingIds[1],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[1],
      starts_at: toBranchDate(`${dMinus2}T16:00`),
      ends_at: toBranchDate(`${dMinus2}T17:30`),
      timezone: 'Asia/Tehran',
      kind: 'group',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '7800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${dMinus3}T11:10`), old_start: null, new_start: toBranchDate(`${dMinus2}T16:00`) }],
    },
    {
      id: bookingIds[2],
      location_id: DEMO_BRANCH_2,
      court_id: courtIds[3],
      starts_at: toBranchDate(`${dMinus1}T18:00`),
      ends_at: toBranchDate(`${dMinus1}T19:00`),
      timezone: 'Asia/Tehran',
      kind: 'private',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '6800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${dMinus2}T09:40`), old_start: null, new_start: toBranchDate(`${dMinus1}T18:00`) }],
    },
    {
      id: bookingIds[3],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[0],
      starts_at: toBranchDate(`${today}T17:00`),
      ends_at: toBranchDate(`${today}T18:00`),
      timezone: 'Asia/Tehran',
      kind: 'private',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '6800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${dMinus1}T09:15`), old_start: null, new_start: toBranchDate(`${today}T17:00`) }],
    },
    {
      id: bookingIds[4],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[1],
      starts_at: toBranchDate(`${today}T19:00`),
      ends_at: toBranchDate(`${today}T20:30`),
      timezone: 'Asia/Tehran',
      kind: 'group',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '7800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${dMinus1}T10:05`), old_start: null, new_start: toBranchDate(`${today}T19:00`) }],
    },
    {
      id: bookingIds[5],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[1],
      starts_at: toBranchDate(`${dPlus2}T18:00`),
      ends_at: toBranchDate(`${dPlus2}T19:00`),
      timezone: 'Asia/Tehran',
      kind: 'rental',
      status: 'confirmed',
      booker_name: 'امیرحسین کاظمی',
      revision: 1,
      amount_minor: '3600000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${today}T11:30`), old_start: null, new_start: toBranchDate(`${dPlus2}T18:00`) }],
    },
    {
      id: bookingIds[6],
      location_id: DEMO_BRANCH_2,
      court_id: courtIds[3],
      starts_at: toBranchDate(`${dPlus3}T16:00`),
      ends_at: toBranchDate(`${dPlus3}T17:30`),
      timezone: 'Asia/Tehran',
      kind: 'group',
      status: 'confirmed',
      booker_name: null,
      revision: 1,
      amount_minor: '7800000',
      currency: 'IRR',
      cancellation_reason: null,
      cancelled_at: null,
      history: [{ action: 'create_booking', created_at: toBranchDate(`${today}T12:00`), old_start: null, new_start: toBranchDate(`${dPlus3}T16:00`) }],
    },
    {
      id: bookingIds[7],
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[1],
      starts_at: toBranchDate(`${dMinus3}T17:00`),
      ends_at: toBranchDate(`${dMinus3}T18:00`),
      timezone: 'Asia/Tehran',
      kind: 'rental',
      status: 'cancelled',
      booker_name: 'فرهاد ناصری',
      revision: 2,
      amount_minor: '3600000',
      currency: 'IRR',
      cancellation_reason: 'بارندگی و درخواست لغو توسط بازیکن',
      cancelled_at: toBranchDate(`${dMinus3}T13:15`),
      history: [
        { action: 'create_booking', created_at: toBranchDate(`${dMinus4}T15:00`), old_start: null, new_start: toBranchDate(`${dMinus3}T17:00`) },
        { action: 'cancel_booking', created_at: toBranchDate(`${dMinus3}T13:15`), old_start: toBranchDate(`${dMinus3}T17:00`), new_start: null },
      ],
    },
  ];

  const sessions: DemoSession[] = [
    {
      id: sessionIds[0],
      booking_id: bookingIds[0],
      location_id: DEMO_BRANCH_1,
      coach_id: coachIds[0],
      status: 'completed',
      capacity: 1,
      actual_start: toBranchDate(`${dMinus4}T10:00`),
      actual_end: toBranchDate(`${dMinus4}T11:00`),
      revision: 2,
      history: [{ recorded_at: toBranchDate(`${dMinus4}T11:10`), actor: 'عرفان دهقانی', corrected: false, reason: null }],
    },
    {
      id: sessionIds[1],
      booking_id: bookingIds[1],
      location_id: DEMO_BRANCH_1,
      coach_id: coachIds[1],
      status: 'completed',
      capacity: 6,
      actual_start: toBranchDate(`${dMinus2}T16:00`),
      actual_end: toBranchDate(`${dMinus2}T17:30`),
      revision: 2,
      history: [{ recorded_at: toBranchDate(`${dMinus2}T17:40`), actor: 'عرفان دهقانی', corrected: false, reason: null }],
    },
    {
      id: sessionIds[2],
      booking_id: bookingIds[2],
      location_id: DEMO_BRANCH_2,
      coach_id: coachIds[0],
      status: 'completed',
      capacity: 1,
      actual_start: toBranchDate(`${dMinus1}T18:00`),
      actual_end: toBranchDate(`${dMinus1}T19:00`),
      revision: 2,
      history: [{ recorded_at: toBranchDate(`${dMinus1}T19:08`), actor: 'عرفان دهقانی', corrected: false, reason: null }],
    },
    {
      id: sessionIds[3],
      booking_id: bookingIds[3],
      location_id: DEMO_BRANCH_1,
      coach_id: coachIds[0],
      status: 'scheduled',
      capacity: 1,
      actual_start: null,
      actual_end: null,
      revision: 1,
      history: [],
    },
    {
      id: sessionIds[4],
      booking_id: bookingIds[4],
      location_id: DEMO_BRANCH_1,
      coach_id: coachIds[1],
      status: 'scheduled',
      capacity: 6,
      actual_start: null,
      actual_end: null,
      revision: 1,
      history: [],
    },
    {
      id: sessionIds[5],
      booking_id: bookingIds[6],
      location_id: DEMO_BRANCH_2,
      coach_id: coachIds[1],
      status: 'scheduled',
      capacity: 6,
      actual_start: null,
      actual_end: null,
      revision: 1,
      history: [],
    },
  ];

  const participants: DemoParticipant[] = [
    { id: '10000000-0000-4000-8000-000000000601', session_id: sessionIds[0], location_id: DEMO_BRANCH_1, student_id: studentIds[0], withdrawn_at: null, attendance: 'present' },
    { id: '10000000-0000-4000-8000-000000000602', session_id: sessionIds[1], location_id: DEMO_BRANCH_1, student_id: studentIds[0], withdrawn_at: null, attendance: 'present' },
    { id: '10000000-0000-4000-8000-000000000603', session_id: sessionIds[1], location_id: DEMO_BRANCH_1, student_id: studentIds[1], withdrawn_at: null, attendance: 'present' },
    { id: '10000000-0000-4000-8000-000000000604', session_id: sessionIds[1], location_id: DEMO_BRANCH_1, student_id: studentIds[2], withdrawn_at: null, attendance: 'late' },
    { id: '10000000-0000-4000-8000-000000000605', session_id: sessionIds[2], location_id: DEMO_BRANCH_2, student_id: studentIds[3], withdrawn_at: null, attendance: 'present' },
    { id: '10000000-0000-4000-8000-000000000606', session_id: sessionIds[3], location_id: DEMO_BRANCH_1, student_id: studentIds[2], withdrawn_at: null, attendance: null },
    { id: '10000000-0000-4000-8000-000000000607', session_id: sessionIds[4], location_id: DEMO_BRANCH_1, student_id: studentIds[0], withdrawn_at: null, attendance: null },
    { id: '10000000-0000-4000-8000-000000000608', session_id: sessionIds[4], location_id: DEMO_BRANCH_1, student_id: studentIds[1], withdrawn_at: null, attendance: null },
    { id: '10000000-0000-4000-8000-000000000609', session_id: sessionIds[4], location_id: DEMO_BRANCH_1, student_id: studentIds[4], withdrawn_at: null, attendance: null },
    { id: '10000000-0000-4000-8000-000000000610', session_id: sessionIds[5], location_id: DEMO_BRANCH_2, student_id: studentIds[1], withdrawn_at: null, attendance: null },
    { id: '10000000-0000-4000-8000-000000000611', session_id: sessionIds[5], location_id: DEMO_BRANCH_2, student_id: studentIds[3], withdrawn_at: null, attendance: null },
  ];

  const invoices: DemoInvoice[] = [
    {
      id: invoiceIds[0],
      location_id: DEMO_BRANCH_1,
      invoice_number: '1041',
      issued_at: toBranchDate(`${dMinus4}T11:30`),
      currency: 'IRR',
      total_minor: 6800000n,
      discount_minor: 0n,
      discount_reason: null,
      voided_at: null,
      void_reason: null,
    },
    {
      id: invoiceIds[1],
      location_id: DEMO_BRANCH_1,
      invoice_number: '1042',
      issued_at: toBranchDate(`${dMinus2}T18:00`),
      currency: 'IRR',
      total_minor: 7300000n,
      discount_minor: 500000n,
      discount_reason: 'تخفیف دورهٔ پاییزی',
      voided_at: null,
      void_reason: null,
    },
    {
      id: invoiceIds[2],
      location_id: DEMO_BRANCH_2,
      invoice_number: '1043',
      issued_at: toBranchDate(`${dMinus1}T19:15`),
      currency: 'IRR',
      total_minor: 6800000n,
      discount_minor: 0n,
      discount_reason: null,
      voided_at: null,
      void_reason: null,
    },
    {
      id: invoiceIds[3],
      location_id: DEMO_BRANCH_1,
      invoice_number: '1044',
      issued_at: toBranchDate(`${dMinus9}T14:00`),
      currency: 'IRR',
      total_minor: 24000000n,
      discount_minor: 0n,
      discount_reason: null,
      voided_at: null,
      void_reason: null,
    },
  ];

  const invoiceItems: DemoInvoiceItem[] = [
    { id: randomUUID(), location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[0], booking_id: bookingIds[0], package_id: null, amount_minor: 6800000n, active: true },
    { id: randomUUID(), location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[1], booking_id: bookingIds[1], package_id: null, amount_minor: 7800000n, active: true },
    { id: randomUUID(), location_id: DEMO_BRANCH_2, invoice_id: invoiceIds[2], booking_id: bookingIds[2], package_id: null, amount_minor: 6800000n, active: true },
    { id: randomUUID(), location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[3], booking_id: null, package_id: pkgIds[0], amount_minor: 24000000n, active: true },
  ];

  const payments: DemoPayment[] = [
    { id: '10000000-0000-4000-8000-000000000701', location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[0], amount_minor: 6800000n, method: 'card', reference: 'شاپرک-۴۹۲۸۱', effective_at: toBranchDate(`${dMinus4}T11:35`) },
    { id: '10000000-0000-4000-8000-000000000702', location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[1], amount_minor: 4000000n, method: 'transfer', reference: 'پایا-۸۸۳۱۰', effective_at: toBranchDate(`${dMinus2}T18:10`) },
    { id: '10000000-0000-4000-8000-000000000703', location_id: DEMO_BRANCH_2, invoice_id: invoiceIds[2], amount_minor: 6800000n, method: 'card', reference: 'کارتخوان-۱۹۰۴', effective_at: toBranchDate(`${dMinus1}T19:20`) },
    { id: '10000000-0000-4000-8000-000000000704', location_id: DEMO_BRANCH_1, invoice_id: invoiceIds[3], amount_minor: 14000000n, method: 'transfer', reference: 'انتقال-۳۰۹۱', effective_at: toBranchDate(`${dMinus9}T14:20`) },
  ];

  const refunds: DemoRefund[] = [
    { id: '10000000-0000-4000-8000-000000000751', location_id: DEMO_BRANCH_2, payment_id: '10000000-0000-4000-8000-000000000703', amount_minor: 800000n, reason: 'تعدیل هزینهٔ روشنایی زمین', effective_at: toBranchDate(`${today}T10:15`) },
  ];

  const packages: DemoPackage[] = [
    {
      id: pkgIds[0],
      location_id: DEMO_BRANCH_1,
      student_id: studentIds[0],
      title: 'بستهٔ ۱۰ جلسه‌ای خصوصی',
      sessions: 10,
      valid_from: dMinus20,
      valid_until: dPlus25,
      status: 'active',
      invoice_id: invoiceIds[3],
      created_at: toBranchDate(`${dMinus10}T12:00`),
    },
    {
      id: pkgIds[1],
      location_id: DEMO_BRANCH_1,
      student_id: studentIds[1],
      title: 'پکیج کلاس گروهی ماهانه',
      sessions: 8,
      valid_from: dMinus10,
      valid_until: dPlus25,
      status: 'active',
      invoice_id: null,
      created_at: toBranchDate(`${dMinus5}T15:00`),
    },
  ];

  const trainingUses: DemoTrainingUse[] = [
    {
      id: '10000000-0000-4000-8000-000000000801',
      location_id: DEMO_BRANCH_1,
      package_id: pkgIds[0],
      participant_id: participants[0].id,
      session_id: sessionIds[0],
      used_at: toBranchDate(`${dMinus4}T11:12`),
      reversed_at: null,
      reversal_reason: null,
    },
    {
      id: '10000000-0000-4000-8000-000000000802',
      location_id: DEMO_BRANCH_1,
      package_id: pkgIds[1],
      participant_id: participants[2].id,
      session_id: sessionIds[1],
      used_at: toBranchDate(`${dMinus2}T17:45`),
      reversed_at: null,
      reversal_reason: null,
    },
  ];

  const expenses: DemoExpense[] = [
    {
      id: '10000000-0000-4000-8000-000000000851',
      location_id: DEMO_BRANCH_1,
      title: 'خرید ۳ کارتن توپ ویلسون US Open',
      category: 'equipment',
      currency: 'IRR',
      amount_minor: 4500000n,
      method: 'card',
      effective_on: dMinus5,
      voided_at: null,
      void_reason: null,
    },
    {
      id: '10000000-0000-4000-8000-000000000852',
      location_id: DEMO_BRANCH_1,
      title: 'غلتک‌کشی و نوسازی خطوط زمین خاک رس',
      category: 'maintenance',
      currency: 'IRR',
      amount_minor: 3200000n,
      method: 'transfer',
      effective_on: dMinus2,
      voided_at: null,
      void_reason: null,
    },
  ];

  const payables: DemoPayable[] = [
    {
      id: '10000000-0000-4000-8000-000000000901',
      location_id: DEMO_BRANCH_1,
      session_id: sessionIds[0],
      currency: 'IRR',
      status: 'paid',
      amount_minor: 8500000n,
      basis_minor: 8500000n,
      basis: 'hourly',
      rate: '8500000',
      approved_at: toBranchDate(`${dMinus4}T12:00`),
      paid_at: toBranchDate(`${dMinus3}T16:00`),
      payment_method: 'transfer',
      reference: 'پایا-۷۷۱۰۲',
    },
    {
      id: '10000000-0000-4000-8000-000000000902',
      location_id: DEMO_BRANCH_1,
      session_id: sessionIds[1],
      currency: 'IRR',
      status: 'approved',
      amount_minor: 9200000n,
      basis_minor: 9200000n,
      basis: 'per_session',
      rate: '9200000',
      approved_at: toBranchDate(`${dMinus2}T18:30`),
      paid_at: null,
      payment_method: null,
      reference: null,
    },
    {
      id: '10000000-0000-4000-8000-000000000903',
      location_id: DEMO_BRANCH_2,
      session_id: sessionIds[2],
      currency: 'IRR',
      status: 'pending',
      amount_minor: null,
      basis_minor: 8500000n,
      basis: 'hourly',
      rate: '8500000',
      approved_at: null,
      paid_at: null,
      payment_method: null,
      reference: null,
    },
  ];

  const adjustments: DemoAdjustment[] = [
    {
      id: '10000000-0000-4000-8000-000000000951',
      location_id: DEMO_BRANCH_1,
      payable_id: payables[0].id,
      delta_minor: 500000n,
      reason: 'پاداش برگزاری جلسهٔ ارزیابی فنی',
      effective_at: toBranchDate(`${dMinus3}T15:30`),
    },
  ];

  const blocks: DemoBlock[] = [
    {
      id: '10000000-0000-4000-8000-000000000981',
      location_id: DEMO_BRANCH_1,
      court_id: courtIds[0],
      starts_at: toBranchDate(`${dPlus2}T12:00`),
      ends_at: toBranchDate(`${dPlus2}T14:00`),
      reason: 'بازبینی فصلی پروژکتورها و خطوط زمین',
      released_at: null,
    },
  ];

  const notices: DemoNotice[] = [
    { id: '10000000-0000-4000-8000-000000000a01', kind: 'lesson_reminder', source_id: bookingIds[3], location_id: DEMO_BRANCH_1, available_at: toBranchDate(`${today}T09:00`) },
    { id: '10000000-0000-4000-8000-000000000a02', kind: 'payment_reminder', source_id: invoiceIds[3], location_id: DEMO_BRANCH_1, available_at: toBranchDate(`${dMinus1}T11:00`) },
    { id: '10000000-0000-4000-8000-000000000a03', kind: 'roster_changed', source_id: sessionIds[4], location_id: DEMO_BRANCH_1, available_at: toBranchDate(`${dMinus1}T16:30`) },
    { id: '10000000-0000-4000-8000-000000000a04', kind: 'schedule_block', source_id: blocks[0].id, location_id: DEMO_BRANCH_1, available_at: toBranchDate(`${dMinus2}T10:00`) },
    { id: '10000000-0000-4000-8000-000000000a05', kind: 'booking_cancelled', source_id: bookingIds[7], location_id: DEMO_BRANCH_1, available_at: toBranchDate(`${dMinus3}T13:15`) },
  ];

  return {
    org: { id: DEMO_ORG_ID, name: 'باشگاه تنیس سام', currency: 'IRR' },
    branches: [
      { id: DEMO_BRANCH_1, name: 'شعبهٔ مرکزی (نیاوران)', timezone: 'Asia/Tehran', active: true },
      { id: DEMO_BRANCH_2, name: 'شعبهٔ دوم (شهرک غرب)', timezone: 'Asia/Tehran', active: true },
    ],
    profiles: {
      [DEMO_OWNER_ID]: 'عرفان دهقانی',
      [DEMO_ADMIN_ID]: 'مریم شریفی',
    },
    members: [
      { user_id: DEMO_OWNER_ID, email: 'owner@samtennis.ir', display_name: 'عرفان دهقانی', role: 'owner', active: true, location_ids: [DEMO_BRANCH_1, DEMO_BRANCH_2] },
      { user_id: DEMO_ADMIN_ID, email: 'admin@samtennis.ir', display_name: 'مریم شریفی', role: 'admin', active: true, location_ids: [DEMO_BRANCH_1] },
    ],
    courts: [
      { id: courtIds[0], location_id: DEMO_BRANCH_1, name: 'زمین ۱ (مرکزی)', surface: 'خاک رس', capacity: 4, amenities: ['نورپردازی LED', 'سقف سرپوشیده', 'اسکوربورد دیجیتال'], notes: 'زمین اصلی مسابقات باشگاه با خاک رس درجه‌یک', status: 'active', revision: 1, updated_at: toBranchDate(`${dMinus5}T10:00`) },
      { id: courtIds[1], location_id: DEMO_BRANCH_1, name: 'زمین ۲ (مرکزی)', surface: 'هاردکورت', capacity: 4, amenities: ['روکش آکریلیک US Open', 'رختکن VIP'], notes: 'مناسب بازی‌های سرعتی و کلاس‌های گروهی', status: 'active', revision: 1, updated_at: toBranchDate(`${dMinus4}T12:00`) },
      { id: courtIds[2], location_id: DEMO_BRANCH_1, name: 'زمین ۳ (تمرینی)', surface: 'خاک رس', capacity: 2, amenities: ['دستگاه توپ‌انداز خودکار'], notes: 'در حال آماده‌سازی برای فصل بهار', status: 'inactive', revision: 1, updated_at: toBranchDate(`${dMinus10}T09:00`) },
      { id: courtIds[3], location_id: DEMO_BRANCH_2, name: 'زمین ۱ (شهرک غرب)', surface: 'هاردکورت', capacity: 4, amenities: ['نورپردازی شب', 'پارکینگ اختصاصی'], notes: 'زمین استاندارد روباز با نورپردازی حرفه‌ای', status: 'active', revision: 1, updated_at: toBranchDate(`${dMinus2}T14:00`) },
    ],
    coaches: [
      {
        id: coachIds[0],
        name: 'آرمان کیانی',
        specialty: 'تمرین خصوصی و تکنیک سرویس',
        qualification: 'مربی درجه ۱ فدراسیون تنیس',
        contact_phone: '09123456781',
        contact_email: 'arman.kiani@samtennis.ir',
        joined_on: dMinus20,
        notes: 'تخصص در اصلاح ضربه فورهند و آماده‌سازی مسابقات کشوری',
        pay_basis: 'hourly',
        pay_amount_minor: 8500000,
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus3}T10:00`),
        locations: [DEMO_BRANCH_1, DEMO_BRANCH_2],
        court_ids: [courtIds[0], courtIds[1], courtIds[3]],
      },
      {
        id: coachIds[1],
        name: 'نیلوفر مرادی',
        specialty: 'آموزش گروهی و رده‌های پایه',
        qualification: 'مدرک بین‌المللی ITF Level 2',
        contact_phone: '09123456782',
        contact_email: 'niloofar.moradi@samtennis.ir',
        joined_on: dMinus20,
        notes: 'مدرس دوره‌های گروهی نوجوانان و بزرگسالان',
        pay_basis: 'per_session',
        pay_amount_minor: 9200000,
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus2}T11:00`),
        locations: [DEMO_BRANCH_1, DEMO_BRANCH_2],
        court_ids: [courtIds[0], courtIds[1], courtIds[3]],
      },
      {
        id: coachIds[2],
        name: 'سهراب فرهادی',
        specialty: 'بدنسازی تخصصی تنیس',
        qualification: 'مربی درجه ۲ ملی',
        contact_phone: '09123456783',
        contact_email: 'sohrab.farhadi@samtennis.ir',
        joined_on: dMinus10,
        notes: 'تمرکز بر چابکی، استقامت و پیشگیری از آسیب شانه',
        pay_basis: 'hourly',
        pay_amount_minor: 6500000,
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus5}T16:00`),
        locations: [DEMO_BRANCH_1],
        court_ids: [courtIds[0], courtIds[1]],
      },
    ],
    students: [
      {
        id: studentIds[0],
        name: 'سارا راد',
        skill_level: 'متوسط',
        contact_phone: '09121112233',
        contact_email: 'sara.rad@example.com',
        joined_on: dMinus20,
        created_at: toBranchDate(`${dMinus20}T10:00`),
        notes: 'هدف: شرکت در تورنمنت آزاد پاییز',
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus1}T15:00`),
        locations: [DEMO_BRANCH_1],
        level_changes: [{ id: randomUUID(), previous_level: 'مقدماتی', current_level: 'متوسط', effective_at: `${dMinus10}T10:00:00Z` }],
      },
      {
        id: studentIds[1],
        name: 'پارسا امینی',
        skill_level: 'مقدماتی',
        contact_phone: '09122223344',
        contact_email: 'parsa.amini@example.com',
        joined_on: dMinus10,
        created_at: toBranchDate(`${dMinus10}T11:00`),
        notes: 'علاقه‌مند به تمرینات گروهی عصرها',
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus2}T18:00`),
        locations: [DEMO_BRANCH_1, DEMO_BRANCH_2],
        level_changes: [],
      },
      {
        id: studentIds[2],
        name: 'کیانا حسینی',
        skill_level: 'پیشرفته',
        contact_phone: '09123334455',
        contact_email: 'kiana.hosseini@example.com',
        joined_on: dMinus20,
        created_at: toBranchDate(`${dMinus20}T14:00`),
        notes: 'بازیکن تیم باشگاه در رده بانوان',
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus2}T19:00`),
        locations: [DEMO_BRANCH_1],
        level_changes: [],
      },
      {
        id: studentIds[3],
        name: 'دانیال رستگار',
        skill_level: 'متوسط',
        contact_phone: '09124445566',
        contact_email: 'danial.rastegar@example.com',
        joined_on: dMinus5,
        created_at: toBranchDate(`${dMinus5}T12:00`),
        notes: 'ثبت‌نام‌شده در شعبهٔ شهرک غرب',
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus1}T19:30`),
        locations: [DEMO_BRANCH_2],
        level_changes: [],
      },
      {
        id: studentIds[4],
        name: 'مهسا توکلی',
        skill_level: 'مقدماتی',
        contact_phone: '09125556677',
        contact_email: 'mahsa.tavakoli@example.com',
        joined_on: dMinus2,
        created_at: toBranchDate(`${dMinus2}T09:00`),
        notes: 'شروع دورهٔ مقدماتی با مربی مرادی',
        status: 'active',
        revision: 1,
        updated_at: toBranchDate(`${dMinus2}T09:00`),
        locations: [DEMO_BRANCH_1],
        level_changes: [],
      },
    ],
    hours,
    rates,
    specials,
    blocks,
    bookings,
    sessions,
    participants,
    invoices,
    invoiceItems,
    payments,
    refunds,
    packages,
    trainingUses,
    expenses,
    payables,
    adjustments,
    notices,
    readNoticeIds: new Set(['10000000-0000-4000-8000-000000000a04', '10000000-0000-4000-8000-000000000a05']),
    resourceEvents: [
      { kind: 'courts', target_id: courtIds[0], occurred_at: toBranchDate(`${dMinus20}T09:00`), action: 'created', actor: 'عرفان دهقانی', previous_status: null, current_status: 'active' },
      { kind: 'courts', target_id: courtIds[0], occurred_at: toBranchDate(`${dMinus10}T12:30`), action: 'rate', actor: 'عرفان دهقانی', previous_status: 'active', current_status: 'active' },
      { kind: 'coaches', target_id: coachIds[0], occurred_at: toBranchDate(`${dMinus20}T09:30`), action: 'created', actor: 'عرفان دهقانی', previous_status: null, current_status: 'active' },
      { kind: 'coaches', target_id: coachIds[0], occurred_at: toBranchDate(`${dMinus5}T15:00`), action: 'hours', actor: 'عرفان دهقانی', previous_status: 'active', current_status: 'active' },
      { kind: 'students', target_id: studentIds[0], occurred_at: toBranchDate(`${dMinus20}T10:00`), action: 'created', actor: 'عرفان دهقانی', previous_status: null, current_status: 'active' },
    ],
    nextInvoiceNumber: 1045,
  };
}

const globalForDemo = globalThis as unknown as { __samDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__samDemoStore) {
    globalForDemo.__samDemoStore = createInitialStore();
  }
  return globalForDemo.__samDemoStore;
}

function branchName(store: DemoStore, locationId: string): string {
  return store.branches.find(b => b.id === locationId)?.name ?? 'شعبهٔ مرکزی';
}

function branchOf(store: DemoStore, locationId: string): Branch | undefined {
  return store.branches.find(b => b.id === locationId);
}

function invoiceTotals(store: DemoStore, invoice: DemoInvoice) {
  const received = store.payments
    .filter(p => p.invoice_id === invoice.id)
    .reduce((sum, p) => sum + p.amount_minor, 0n);
  const refunded = store.refunds
    .filter(r => store.payments.some(p => p.id === r.payment_id && p.invoice_id === invoice.id))
    .reduce((sum, r) => sum + r.amount_minor, 0n);
  const netPaid = received - refunded;
  let status: InvoiceState;
  let due = 0n;
  if (invoice.voided_at) {
    status = 'voided';
    due = 0n;
  } else {
    due = invoice.total_minor > netPaid ? invoice.total_minor - netPaid : 0n;
    if (due === 0n && invoice.total_minor >= 0n) {
      status = 'settled';
    } else if (netPaid > 0n) {
      status = 'partial';
    } else {
      status = 'open';
    }
  }
  return { received: netPaid, refunded, due, status };
}

// ---------- Club & Access ----------

export function demoClubs(userId: string): Club[] {
  const store = getDemoStore();
  const member = store.members.find(m => m.user_id === userId && m.active && (m.role === 'owner' || m.role === 'admin'));
  if (!member) return [];
  return [{ id: store.org.id, name: store.org.name, role: member.role }];
}

export function demoBranches(_userId: string, org: string): Branch[] {
  const store = getDemoStore();
  return org === store.org.id ? store.branches : [];
}

export function demoMembers(_userId: string, org: string): Member[] {
  const store = getDemoStore();
  return org === store.org.id ? store.members : [];
}

export function demoDisplayName(userId: string): string {
  return getDemoStore().profiles[userId] ?? 'مدیر باشگاه';
}

export function demoCurrency(org: string): string {
  const store = getDemoStore();
  return org === store.org.id ? store.org.currency : 'IRR';
}

export function demoOverviewCounts(org: string) {
  const store = getDemoStore();
  if (org !== store.org.id) return { courts: 0, bookings: 0, coaches: 0, students: 0 };
  const now = new Date();
  return {
    courts: store.courts.filter(c => c.status === 'active').length,
    bookings: store.bookings.filter(b => b.status === 'confirmed' && b.starts_at >= now).length,
    coaches: store.coaches.filter(c => c.status === 'active').length,
    students: store.students.filter(s => s.status === 'active').length,
  };
}

export function demoUpdateProfile(userId: string, name: string) {
  const store = getDemoStore();
  store.profiles[userId] = name;
  const member = store.members.find(m => m.user_id === userId);
  if (member) member.display_name = name;
}

export function demoSetMember(targetUserId: string, role: ClubRole, active: boolean, locationIds: string[]) {
  const store = getDemoStore();
  const existing = store.members.find(m => m.user_id === targetUserId);
  if (existing) {
    existing.role = role;
    existing.active = active;
    existing.location_ids = locationIds;
  } else {
    store.members.push({
      user_id: targetUserId,
      email: `manager-${targetUserId.slice(0, 6)}@samtennis.ir`,
      display_name: 'مدیر جدید باشگاه',
      role,
      active,
      location_ids: locationIds,
    });
  }
}

export function demoGenerateInvite(email: string, role: ClubRole, locationIds: string[], origin: string) {
  const store = getDemoStore();
  const id = randomUUID();
  store.members.push({
    user_id: id,
    email,
    display_name: email.split('@')[0],
    role,
    active: true,
    location_ids: locationIds,
  });
  return `${origin}/redeem?mode=invite#token=demo-invite-${id.replace(/-/g, '')}`;
}

export function demoGenerateRecovery(userId: string, origin: string) {
  const store = getDemoStore();
  const member = store.members.find(m => m.user_id === userId && m.active);
  if (!member?.email) throw new InputError('denied', 403);
  return `${origin}/redeem?mode=recovery#token=demo-recovery-${userId.replace(/-/g, '')}`;
}

// ---------- Resources ----------

function toResourceRow(store: DemoStore, kind: ResourceKind, item: DemoCourt | DemoCoach | DemoStudent) {
  if (kind === 'courts') {
    const c = item as DemoCourt;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      updated_at: c.updated_at,
      subtitle: c.surface,
      branch_names: [branchName(store, c.location_id)],
      locations: [c.location_id],
      revision: String(c.revision),
      data: { surface: c.surface, capacity: c.capacity, amenities: c.amenities, notes: c.notes },
    };
  }
  if (kind === 'coaches') {
    const p = item as DemoCoach;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      updated_at: p.updated_at,
      subtitle: p.specialty,
      branch_names: p.locations.map(id => branchName(store, id)),
      locations: p.locations,
      revision: String(p.revision),
      data: {
        specialty: p.specialty,
        qualification: p.qualification,
        contact_phone: p.contact_phone,
        contact_email: p.contact_email,
        joined_on: p.joined_on,
        notes: p.notes,
        pay_basis: p.pay_basis,
        pay_amount_minor: p.pay_amount_minor,
      },
    };
  }
  const s = item as DemoStudent;
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    updated_at: s.updated_at,
    subtitle: s.skill_level,
    branch_names: s.locations.map(id => branchName(store, id)),
    locations: s.locations,
    revision: String(s.revision),
    data: {
      skill_level: s.skill_level,
      contact_phone: s.contact_phone,
      contact_email: s.contact_email,
      joined_on: s.joined_on,
      notes: s.notes,
    },
  };
}

export function demoResourceList(
  kind: ResourceKind,
  filters: { q: string; status: string; branch: string; sort: string; page: number; inactiveDays: number },
) {
  const store = getDemoStore();
  const pageSize = 12;
  const source = kind === 'courts' ? store.courts : kind === 'coaches' ? store.coaches : store.students;
  const normalizedQ = normalizeSearchText(filters.q);
  const cutoffMs = Date.now() - filters.inactiveDays * 86400000;

  let items = source.map(item => toResourceRow(store, kind, item)).filter(item => {
    if (normalizedQ) {
      const hay = normalizeSearchText(`${item.name} ${item.subtitle ?? ''}`);
      if (!hay.includes(normalizedQ)) return false;
    }
    if (filters.status && item.status !== filters.status) return false;
    if (filters.branch && !item.locations.includes(filters.branch)) return false;
    if (filters.inactiveDays > 0 && kind === 'students') {
      const student = store.students.find(s => s.id === item.id)!;
      const joinedMs = student.joined_on ? Date.parse(`${student.joined_on}T00:00:00Z`) : student.created_at.getTime();
      if (joinedMs > cutoffMs) return false;
      const recentVisit = store.participants.some(p => {
        if (p.student_id !== student.id) return false;
        const sess = store.sessions.find(s => s.id === p.session_id && s.status === 'completed');
        return Boolean(sess?.actual_start && sess.actual_start.getTime() >= cutoffMs);
      });
      if (recentVisit) return false;
    }
    return true;
  });

  if (filters.sort === 'newest') {
    items = items.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime() || a.id.localeCompare(b.id));
  } else if (filters.sort === 'status') {
    items = items.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  } else {
    items = items.sort((a, b) => a.name.localeCompare(b.name));
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, pages);
  const rows = items.slice((page - 1) * pageSize, page * pageSize).map(({ id, name, status, updated_at, subtitle, branch_names }) => ({
    id,
    name,
    status,
    updated_at,
    subtitle,
    branch_names,
  }));
  return { rows, total, pages, page };
}

export function demoResourceDetail(kind: ResourceKind, id: string) {
  const store = getDemoStore();
  const source = kind === 'courts' ? store.courts : kind === 'coaches' ? store.coaches : store.students;
  const item = source.find(x => x.id === id);
  return item ? toResourceRow(store, kind, item) : undefined;
}

export function demoSearchResources(rawQuery: string, limit = 12): ResourceSearchItem[] {
  const store = getDemoStore();
  const query = normalizeSearchText(rawQuery);
  if (!query) return [];
  const cap = Math.max(1, Math.min(limit, 30));
  const combined: ResourceSearchItem[] = [
    ...store.students.map(s => ({
      id: s.id,
      kind: 'students' as const,
      name: s.name,
      status: s.status,
      subtitle: s.skill_level,
      branch_names: s.locations.map(id => branchName(store, id)),
    })),
    ...store.coaches.map(c => ({
      id: c.id,
      kind: 'coaches' as const,
      name: c.name,
      status: c.status,
      subtitle: c.specialty,
      branch_names: c.locations.map(id => branchName(store, id)),
    })),
    ...store.courts.map(t => ({
      id: t.id,
      kind: 'courts' as const,
      name: t.name,
      status: t.status,
      subtitle: t.surface,
      branch_names: [branchName(store, t.location_id)],
    })),
  ];
  const order = { active: 0, inactive: 1, archived: 2 };
  return combined
    .filter(item => normalizeSearchText(item.name).includes(query))
    .sort((a, b) => {
      const sDiff = order[a.status] - order[b.status];
      if (sDiff !== 0) return sDiff;
      const idxA = normalizeSearchText(a.name).indexOf(query);
      const idxB = normalizeSearchText(b.name).indexOf(query);
      if ((idxA === 0) !== (idxB === 0)) return idxA === 0 ? -1 : 1;
      return idxA - idxB || a.name.localeCompare(b.name);
    })
    .slice(0, cap);
}

export function demoResourceRecords(kind: ResourceKind, id: string) {
  const store = getDemoStore();
  const history = store.resourceEvents
    .filter(e => e.kind === kind && e.target_id === id)
    .sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime())
    .map(({ occurred_at, action, actor, previous_status, current_status }) => ({
      occurred_at,
      action,
      actor,
      previous_status,
      current_status,
    }));

  const calendar: Array<{
    id: string;
    starts_at: Date;
    ends_at: Date;
    kind: 'rental' | 'private' | 'group';
    booking_status: 'confirmed' | 'cancelled';
    branch_name: string;
    timezone: string;
    session_status: ClassState | null;
    attendance: AttendanceState | null;
  }> = [];

  for (const b of store.bookings) {
    const sess = store.sessions.find(s => s.booking_id === b.id);
    if (kind === 'courts' && b.court_id !== id) continue;
    if (kind === 'coaches' && sess?.coach_id !== id) continue;
    let attendance: AttendanceState | null = null;
    if (kind === 'students') {
      const part = sess ? store.participants.find(p => p.session_id === sess.id && p.student_id === id && !p.withdrawn_at) : null;
      if (!part) continue;
      attendance = part.attendance;
    }
    calendar.push({
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      kind: b.kind,
      booking_status: b.status,
      branch_name: branchName(store, b.location_id),
      timezone: b.timezone,
      session_status: sess?.status ?? null,
      attendance,
    });
  }

  const now = Date.now();
  calendar.sort((a, b) => {
    const aUp = a.starts_at.getTime() >= now ? 1 : 0;
    const bUp = b.starts_at.getTime() >= now ? 1 : 0;
    if (aUp !== bUp) return bUp - aUp;
    return aUp ? a.starts_at.getTime() - b.starts_at.getTime() : b.starts_at.getTime() - a.starts_at.getTime();
  });

  let progress: { completed: number; minutes: number; attended: number } | null = null;
  if (kind !== 'courts') {
    const completedRows = calendar.filter(r => r.session_status === 'completed');
    const minutes = completedRows.reduce((sum, r) => {
      const sess = store.sessions.find(s => s.booking_id === r.id);
      if (!sess?.actual_start || !sess.actual_end) return sum;
      return sum + Math.round((sess.actual_end.getTime() - sess.actual_start.getTime()) / 60000);
    }, 0);
    const attended = completedRows.filter(r => r.attendance === 'present' || r.attendance === 'late').length;
    progress = { completed: completedRows.length, minutes, attended };
  }

  return { history, calendar: calendar.slice(0, 12), progress };
}

export function demoAvailableCourts(coachId?: string) {
  const store = getDemoStore();
  const options = store.courts
    .map(c => ({ id: c.id, location_id: c.location_id, name: c.name }))
    .sort((a, b) => a.location_id.localeCompare(b.location_id) || a.name.localeCompare(b.name));
  const selected = coachId ? store.coaches.find(c => c.id === coachId)?.court_ids ?? [] : [];
  return { options, selected };
}

export function demoResourceHours(kind: 'courts' | 'coaches', id: string) {
  const store = getDemoStore();
  return store.hours
    .filter(h => h.kind === kind && h.target_id === id)
    .map(({ id: hid, location_id, weekday, from_date, until_date, starts, ends }) => ({
      id: hid,
      location_id,
      weekday,
      from_date,
      until_date,
      starts,
      ends,
    }));
}

export function demoCourtSettings(org: string, id: string) {
  const store = getDemoStore();
  const now = new Date();
  const rates = store.rates
    .filter(r => r.court_id === id)
    .map(r => ({
      id: r.id,
      kind: r.kind,
      from_time: r.from_time,
      until_time: r.until_time,
      unit_minutes: r.unit_minutes,
      amount_minor: r.amount_minor,
      current: r.from_time <= now && (!r.until_time || r.until_time > now),
    }));
  const blocks = store.blocks
    .filter(b => b.court_id === id)
    .map(b => ({
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      reason: b.reason,
      released_at: b.released_at,
      releasable: !b.released_at && b.starts_at >= new Date(Date.now() - 60000),
    }));
  const court = store.courts.find(c => c.id === id);
  const open_minutes = court?.status === 'active' ? 840 : 0;
  const today = branchDateTime('Asia/Tehran').date;
  const booked_minutes = store.bookings
    .filter(b => b.court_id === id && b.status === 'confirmed' && localDayOf(b.starts_at, b.timezone) === today)
    .reduce((sum, b) => sum + Math.round((b.ends_at.getTime() - b.starts_at.getTime()) / 60000), 0);
  return {
    rates,
    blocks,
    occupancy: { open_minutes, booked_minutes },
    currency: demoCurrency(org),
  };
}

function parseField(values: URLSearchParams, key: string, max: number, required = false): string {
  const value = (values.get(key) ?? '').trim();
  if (value.length > max || (required && !value)) throw new InputError('resource-invalid');
  return value;
}
function parseId(values: URLSearchParams, key: string): string {
  const value = values.get(key) ?? '';
  if (!uuid(value)) throw new InputError('resource-invalid');
  return value;
}
function parseIds(values: URLSearchParams, key: string): string[] {
  const selected = [...new Set(values.getAll(key))].sort();
  if (selected.length > 100 || selected.some(value => !uuid(value))) throw new InputError('resource-invalid');
  return selected;
}
function parseNumeric(value: string, min: number, max: number): number {
  const normalized = asciiDigits(value.trim()).replace(/٬/g, ',');
  const result = Number(normalized.replace(/,/g, ''));
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(normalized) || !Number.isSafeInteger(result) || result < min || result > max) {
    throw new InputError('resource-number');
  }
  return result;
}
function parseDateStr(value: string, optional = false): string | null {
  const cleaned = asciiDigits(value);
  if (!cleaned && optional) return null;
  if (!validCalendarDate(cleaned)) throw new InputError('resource-date');
  return cleaned;
}
function parseMinuteStr(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(asciiDigits(value.trim()));
  if (!match || +match[1] > 24 || +match[2] > 59 || (+match[1] === 24 && +match[2] !== 0)) {
    throw new InputError('resource-time');
  }
  return +match[1] * 60 + +match[2];
}

export function demoRunResourceCommand(
  action: 'resource' | 'resource-hours' | 'resource-rate' | 'resource-block' | 'resource-release',
  values: URLSearchParams,
  userId: string,
  org: string,
): string {
  const store = getDemoStore();
  const kind = values.get('kind') ?? '';
  if (!isResourceKind(kind)) throw new InputError('resource-invalid');
  const actor = demoDisplayName(userId);

  if (action === 'resource') {
    const target = values.get('id') ? parseId(values, 'id') : undefined;
    if (values.get('intent') === 'archive') {
      if (!target) throw new InputError('resource-invalid');
      const list = kind === 'courts' ? store.courts : kind === 'coaches' ? store.coaches : store.students;
      const found = list.find(i => i.id === target);
      if (!found) throw new InputError('denied', 404);
      const prev = found.status;
      found.status = 'archived';
      found.revision += 1;
      found.updated_at = new Date();
      store.resourceEvents.push({ kind, target_id: target, occurred_at: new Date(), action: 'archived', actor, previous_status: prev, current_status: 'archived' });
      return `${resourcePath(org, kind, target)}?saved=1`;
    }
    const status = values.get('status') as ResourceStatus;
    if (!['active', 'inactive', 'archived'].includes(status)) throw new InputError('resource-invalid');
    const locations = parseIds(values, 'location');
    if (!locations.length) throw new InputError('resource-location');
    const name = parseField(values, 'name', kind === 'courts' ? 100 : 120, true);
    const notes = parseField(values, 'notes', 2000) || null;
    const now = new Date();

    if (kind === 'courts') {
      const surface = parseField(values, 'surface', 60, true);
      const capacity = parseNumeric(parseField(values, 'capacity', 5), 1, 100);
      const amenities = [...new Set(parseField(values, 'amenities', 600).split(/[،,\n]/).map(v => v.trim()).filter(Boolean))];
      if (target) {
        const court = store.courts.find(c => c.id === target);
        if (!court) throw new InputError('denied', 404);
        const prev = court.status;
        court.name = name;
        court.status = status;
        court.location_id = locations[0];
        court.surface = surface;
        court.capacity = capacity;
        court.amenities = amenities;
        court.notes = notes;
        court.revision += 1;
        court.updated_at = now;
        store.resourceEvents.push({ kind, target_id: target, occurred_at: now, action: 'edited', actor, previous_status: prev, current_status: status });
        return `${resourcePath(org, kind, target)}?saved=1`;
      }
      const id = randomUUID();
      store.courts.push({ id, location_id: locations[0], name, surface, capacity, amenities, notes, status, revision: 1, updated_at: now });
      for (let w = 1; w <= 7; w++) {
        store.hours.push({ id: randomUUID(), kind: 'courts', target_id: id, location_id: locations[0], weekday: w, from_date: branchDateTime('Asia/Tehran').date, until_date: null, starts: 480, ends: 1320 });
      }
      for (const [k, amt] of [['rental', '1800000'], ['private', '3400000'], ['group', '2600000']] as const) {
        store.rates.push({ id: randomUUID(), location_id: locations[0], court_id: id, kind: k, from_time: now, until_time: null, unit_minutes: 30, amount_minor: amt });
      }
      store.resourceEvents.push({ kind, target_id: id, occurred_at: now, action: 'created', actor, previous_status: null, current_status: status });
      return `${resourcePath(org, kind, id)}?saved=1`;
    }

    const phone = asciiDigits(parseField(values, 'phone', 35)) || null;
    const email = parseField(values, 'email', 254).toLowerCase() || null;
    const joined_on = parseDateStr(parseField(values, 'joined_on', 10), true);
    if (kind === 'coaches') {
      const specialty = parseField(values, 'specialty', 120) || null;
      const qualification = parseField(values, 'qualification', 240) || null;
      const basis = (parseField(values, 'pay_basis', 20) || null) as 'hourly' | 'per_session' | null;
      const rawPay = parseField(values, 'pay_amount_minor', 20);
      const payAmount = rawPay ? parseNumeric(rawPay, 0, 9999999999999) : null;
      const court_ids = parseIds(values, 'court_id');
      if (target) {
        const coach = store.coaches.find(c => c.id === target);
        if (!coach) throw new InputError('denied', 404);
        const prev = coach.status;
        Object.assign(coach, { name, status, locations, notes, specialty, qualification, contact_phone: phone, contact_email: email, joined_on, pay_basis: basis, pay_amount_minor: payAmount, court_ids, updated_at: now });
        coach.revision += 1;
        store.resourceEvents.push({ kind, target_id: target, occurred_at: now, action: 'edited', actor, previous_status: prev, current_status: status });
        return `${resourcePath(org, kind, target)}?saved=1`;
      }
      const id = randomUUID();
      store.coaches.push({ id, name, specialty, qualification, contact_phone: phone, contact_email: email, joined_on, notes, pay_basis: basis, pay_amount_minor: payAmount, status, revision: 1, updated_at: now, locations, court_ids });
      store.resourceEvents.push({ kind, target_id: id, occurred_at: now, action: 'created', actor, previous_status: null, current_status: status });
      return `${resourcePath(org, kind, id)}?saved=1`;
    }

    const skill_level = parseField(values, 'skill_level', 100) || null;
    if (target) {
      const student = store.students.find(s => s.id === target);
      if (!student) throw new InputError('denied', 404);
      const prev = student.status;
      if (skill_level !== student.skill_level) {
        student.level_changes.push({ id: randomUUID(), previous_level: student.skill_level, current_level: skill_level, effective_at: now.toISOString() });
      }
      Object.assign(student, { name, status, locations, notes, skill_level, contact_phone: phone, contact_email: email, joined_on, updated_at: now });
      student.revision += 1;
      store.resourceEvents.push({ kind, target_id: target, occurred_at: now, action: 'edited', actor, previous_status: prev, current_status: status });
      return `${resourcePath(org, kind, target)}?saved=1`;
    }
    const id = randomUUID();
    store.students.push({ id, name, skill_level, contact_phone: phone, contact_email: email, joined_on, created_at: now, notes, status, revision: 1, updated_at: now, locations, level_changes: [] });
    store.resourceEvents.push({ kind, target_id: id, occurred_at: now, action: 'created', actor, previous_status: null, current_status: status });
    return `${resourcePath(org, kind, id)}?saved=1`;
  }

  const target = parseId(values, 'id');
  const location = parseId(values, 'location');
  const now = new Date();
  if (action === 'resource-hours' && kind !== 'students') {
    const weekday = parseNumeric(parseField(values, 'weekday', 2), 1, 7);
    const from = parseDateStr(parseField(values, 'from', 10, true))!;
    const closed = values.get('closed') === 'yes';
    const start = closed ? null : parseMinuteStr(parseField(values, 'start', 8, true));
    const end = closed ? null : parseMinuteStr(parseField(values, 'end', 8, true));
    if (start !== null && end !== null && start >= end) throw new InputError('resource-time');
    store.hours = store.hours.filter(h => !(h.kind === kind && h.target_id === target && h.location_id === location && h.weekday === weekday && h.from_date >= from));
    if (!closed && start !== null && end !== null) {
      store.hours.push({ id: randomUUID(), kind, target_id: target, location_id: location, weekday, from_date: from, until_date: null, starts: start, ends: end });
    }
    store.resourceEvents.push({ kind, target_id: target, occurred_at: now, action: 'hours', actor, previous_status: null, current_status: null });
  } else if (action === 'resource-rate' && kind === 'courts') {
    const booking = parseField(values, 'booking_kind', 15, true) as 'rental' | 'private' | 'group';
    if (!Object.hasOwn(bookingKinds, booking)) throw new InputError('resource-invalid');
    const from = parseDateStr(parseField(values, 'from', 10, true))!;
    const unit = parseNumeric(parseField(values, 'unit_minutes', 8), 1, 1440);
    const amount = parseMinor(parseField(values, 'amount_minor', 24, true), values.get('unit') ?? 'minor', store.org.currency);
    if (amount === null) throw new InputError('finance-amount');
    const fromTime = toBranchDate(`${from}T00:00`);
    for (const r of store.rates) {
      if (r.court_id === target && r.kind === booking && !r.until_time) r.until_time = fromTime;
    }
    store.rates.push({ id: randomUUID(), location_id: location, court_id: target, kind: booking, from_time: fromTime, until_time: null, unit_minutes: unit, amount_minor: amount.toString() });
    store.resourceEvents.push({ kind, target_id: target, occurred_at: now, action: 'rate', actor, previous_status: null, current_status: null });
  } else if (action === 'resource-block' && kind === 'courts') {
    const from = asciiDigits(parseField(values, 'starts_at', 16, true));
    const to = asciiDigits(parseField(values, 'ends_at', 16, true));
    const tz = branchOf(store, location)?.timezone ?? 'Asia/Tehran';
    const start = toBranchDate(from, tz);
    const end = toBranchDate(to, tz);
    if (start >= end) throw new InputError('resource-time');
    store.blocks.push({ id: randomUUID(), location_id: location, court_id: target, starts_at: start, ends_at: end, reason: parseField(values, 'reason', 250, true), released_at: null });
  } else if (action === 'resource-release' && kind === 'courts') {
    const blockId = parseId(values, 'block');
    const block = store.blocks.find(b => b.id === blockId && b.court_id === target);
    if (block) block.released_at = now;
  }
  return `${resourcePath(org, kind, target)}?saved=1`;
}

// ---------- Calendar & Bookings ----------

function formatBooking(store: DemoStore, b: DemoBooking) {
  const court = store.courts.find(c => c.id === b.court_id);
  const sess = store.sessions.find(s => s.booking_id === b.id);
  const coach = sess?.coach_id ? store.coaches.find(c => c.id === sess.coach_id) : null;
  return {
    id: b.id,
    location_id: b.location_id,
    court_id: b.court_id,
    court: court?.name ?? 'زمین',
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    timezone: b.timezone,
    local_day: localDayOf(b.starts_at, b.timezone),
    kind: b.kind,
    status: b.status,
    booker_name: b.booker_name,
    coach: coach?.name ?? null,
    session_id: sess?.id ?? null,
    session_status: sess?.status ?? null,
    capacity: sess?.capacity ?? null,
  };
}

export function demoCalendarCourts(branchId: string) {
  const store = getDemoStore();
  return store.courts
    .filter(c => c.location_id === branchId)
    .map(c => ({ id: c.id, name: c.name, surface: c.surface, status: c.status }))
    .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || a.name.localeCompare(b.name));
}

export function demoCalendarPeriod(branch: Branch, court: string | undefined, start: string, end: string, requestedPage: number) {
  const store = getDemoStore();
  const pageSize = 30;
  const matching = store.bookings
    .filter(b => {
      if (b.location_id !== branch.id) return false;
      if (court && b.court_id !== court) return false;
      const day = localDayOf(b.starts_at, branch.timezone);
      return day >= start && day < end;
    })
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());

  const dayMap = new Map<string, { day: string; confirmed: number; completed: number; cancelled: number }>();
  for (const b of matching) {
    const day = localDayOf(b.starts_at, branch.timezone);
    const entry = dayMap.get(day) ?? { day, confirmed: 0, completed: 0, cancelled: 0 };
    const sess = store.sessions.find(s => s.booking_id === b.id);
    if (b.status === 'cancelled') entry.cancelled += 1;
    else if (sess?.status === 'completed') entry.completed += 1;
    else entry.confirmed += 1;
    dayMap.set(day, entry);
  }
  const days = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  const total = matching.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const rows = matching.slice((page - 1) * pageSize, page * pageSize).map(b => formatBooking(store, b));
  return { days, rows, total, page, pages };
}

export function demoCourtFreeWindows(branch: Branch, day: string, court?: string) {
  if (!branch.active) return [];
  const store = getDemoStore();
  const now = new Date();
  const courts = store.courts.filter(c => c.location_id === branch.id && c.status === 'active' && (!court || c.id === court));
  const windows: Array<{ court_id: string; start_at: Date; end_at: Date }> = [];

  for (const c of courts) {
    const dayStart = toBranchDate(`${day}T08:00`, branch.timezone);
    const dayEnd = toBranchDate(`${day}T22:00`, branch.timezone);
    const busy = [
      ...store.bookings
        .filter(b => b.court_id === c.id && b.status === 'confirmed' && b.ends_at > dayStart && b.starts_at < dayEnd)
        .map(b => [b.starts_at.getTime(), b.ends_at.getTime()] as const),
      ...store.blocks
        .filter(b => b.court_id === c.id && !b.released_at && b.ends_at > dayStart && b.starts_at < dayEnd)
        .map(b => [b.starts_at.getTime(), b.ends_at.getTime()] as const),
    ].sort((a, b) => a[0] - b[0]);

    let cursor = Math.max(dayStart.getTime(), now.getTime());
    for (const [bStart, bEnd] of busy) {
      if (bStart > cursor) windows.push({ court_id: c.id, start_at: new Date(cursor), end_at: new Date(Math.min(bStart, dayEnd.getTime())) });
      cursor = Math.max(cursor, bEnd);
    }
    if (cursor < dayEnd.getTime()) {
      windows.push({ court_id: c.id, start_at: new Date(cursor), end_at: dayEnd });
    }
  }
  return windows;
}

export function demoCalendarBookingOptions(branchId: string) {
  const store = getDemoStore();
  return {
    coaches: store.coaches.filter(c => c.status === 'active' && c.locations.includes(branchId)).map(c => ({ id: c.id, name: c.name })),
    students: store.students.filter(s => s.status === 'active' && s.locations.includes(branchId)).map(s => ({ id: s.id, name: s.name })),
  };
}

export function demoCalendarBooking(branches: Branch[], id: string) {
  const store = getDemoStore();
  const booking = store.bookings.find(b => b.id === id);
  if (!booking) return null;
  const branch = branches.find(b => b.id === booking.location_id);
  if (!branch) return null;
  const sess = store.sessions.find(s => s.booking_id === booking.id);
  const invItem = store.invoiceItems.find(i => i.booking_id === booking.id && i.active);
  const coveredByTraining =
    booking.kind === 'private' &&
    Boolean(
      sess &&
        store.participants.some(
          p => p.session_id === sess.id && store.trainingUses.some(u => u.participant_id === p.id && !u.reversed_at),
        ),
    );
  const base = formatBooking(store, booking);
  const detail = {
    ...base,
    revision: String(booking.revision),
    active_invoice_id: invItem?.invoice_id ?? null,
    covered_by_training: coveredByTraining,
    amount: booking.amount_minor,
    currency: booking.currency,
    cancellation_reason: booking.cancellation_reason,
    cancelled_at: booking.cancelled_at,
  };
  const students = sess
    ? store.participants
        .filter(p => p.session_id === sess.id && !p.withdrawn_at)
        .map(p => ({ id: p.student_id, name: store.students.find(s => s.id === p.student_id)?.name ?? 'شاگرد' }))
    : [];
  return { detail, branch, students, history: booking.history };
}

export function demoRunBookingAction(action: 'booking-quote' | 'booking-create' | 'booking-move' | 'booking-cancel', form: URLSearchParams, org: string) {
  const store = getDemoStore();
  const branchId = form.get('branch') ?? '';
  const branch = branchOf(store, branchId);
  if (!branch) throw new InputError('denied', 403);

  if (action === 'booking-move' || action === 'booking-cancel') {
    const bookingId = form.get('booking') ?? '';
    const booking = store.bookings.find(b => b.id === bookingId && b.location_id === branchId);
    if (!booking) throw new InputError('denied', 404);
    if (action === 'booking-move') {
      const startIso = calendarDateTime(form.get('start') ?? '');
      if (!startIso) throw new InputError('booking-time');
      const dur = booking.ends_at.getTime() - booking.starts_at.getTime();
      const oldStart = booking.starts_at;
      const newStart = toBranchDate(startIso, branch.timezone);
      booking.starts_at = newStart;
      booking.ends_at = new Date(newStart.getTime() + dur);
      booking.revision += 1;
      booking.history.push({ action: 'reschedule_booking', created_at: new Date(), old_start: oldStart, new_start: newStart });
    } else {
      const reason = (form.get('reason') ?? '').trim();
      if (!reason) throw new InputError('booking-reason');
      booking.status = 'cancelled';
      booking.cancellation_reason = reason;
      booking.cancelled_at = new Date();
      booking.revision += 1;
      booking.history.push({ action: 'cancel_booking', created_at: new Date(), old_start: booking.starts_at, new_start: null });
      const sess = store.sessions.find(s => s.booking_id === booking.id);
      if (sess) sess.status = 'cancelled';
    }
    return { next: calendarPath(org, { booking: booking.id }) + '?saved=1' };
  }

  const courtId = form.get('court') ?? '';
  const kind = (form.get('kind') ?? '') as 'rental' | 'private' | 'group';
  const startIso = calendarDateTime(form.get('start') ?? '');
  if (!startIso) throw new InputError('booking-time');
  const minutes = Number(asciiDigits((form.get('minutes') ?? '').trim()));
  if (!Number.isSafeInteger(minutes) || minutes < 30 || minutes > 1440) throw new InputError('booking-invalid');
  const rule = store.rates.find(r => r.court_id === courtId && r.kind === kind && !r.until_time);
  if (!rule) throw new InputError('booking-no-rate');
  if (minutes % rule.unit_minutes !== 0) throw new InputError('booking-duration');
  const amount = (BigInt(rule.amount_minor) * BigInt(minutes / rule.unit_minutes)).toString();
  if (action === 'booking-quote') {
    return { price: { amount, currency: store.org.currency } };
  }

  const start = toBranchDate(startIso, branch.timezone);
  const end = new Date(start.getTime() + minutes * 60000);
  const booker = (form.get('booker') ?? '').trim() || null;
  const coach = form.get('coach') || null;
  const student = form.get('student') || null;
  const capacity = kind === 'group' ? Number(asciiDigits((form.get('capacity') ?? '6').trim())) : kind === 'private' ? 1 : null;
  const bookingId = randomUUID();
  store.bookings.push({
    id: bookingId,
    location_id: branchId,
    court_id: courtId,
    starts_at: start,
    ends_at: end,
    timezone: branch.timezone,
    kind,
    status: 'confirmed',
    booker_name: booker,
    revision: 1,
    amount_minor: amount,
    currency: store.org.currency,
    cancellation_reason: null,
    cancelled_at: null,
    history: [{ action: 'create_booking', created_at: new Date(), old_start: null, new_start: start }],
  });
  if (kind !== 'rental') {
    const sessionId = randomUUID();
    store.sessions.push({
      id: sessionId,
      booking_id: bookingId,
      location_id: branchId,
      coach_id: coach,
      status: 'scheduled',
      capacity: capacity ?? 1,
      actual_start: null,
      actual_end: null,
      revision: 1,
      history: [],
    });
    if (student) {
      store.participants.push({
        id: randomUUID(),
        session_id: sessionId,
        location_id: branchId,
        student_id: student,
        withdrawn_at: null,
        attendance: null,
      });
    }
  }
  return { next: calendarPath(org, { booking: bookingId }) + '?saved=1' };
}

// ---------- Classes & Attendance ----------

export function demoClassList(branch: Branch, from: string, to: string, status: ClassState | null, page: number) {
  const store = getDemoStore();
  const size = 24;
  const rows = store.sessions
    .map(s => {
      const b = store.bookings.find(item => item.id === s.booking_id);
      if (!b || b.location_id !== branch.id || (b.kind !== 'private' && b.kind !== 'group')) return null;
      const day = localDayOf(b.starts_at, branch.timezone);
      if (day < from || day >= to) return null;
      if (status && s.status !== status) return null;
      const court = store.courts.find(c => c.id === b.court_id)?.name ?? 'زمین';
      const coach = s.coach_id ? store.coaches.find(c => c.id === s.coach_id)?.name ?? null : null;
      const enrolled = store.participants.filter(p => p.session_id === s.id && !p.withdrawn_at).length;
      return {
        id: s.id,
        booking_id: s.booking_id,
        kind: b.kind,
        status: s.status,
        capacity: s.capacity,
        enrolled,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        timezone: b.timezone,
        court,
        coach,
        actual_start: s.actual_start,
        actual_end: s.actual_end,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());

  const slice = rows.slice((page - 1) * size, (page - 1) * size + size + 1);
  return { rows: slice.slice(0, size), hasNext: slice.length > size };
}

export function demoClassDetail(id: string) {
  const store = getDemoStore();
  const s = store.sessions.find(item => item.id === id);
  if (!s) return null;
  const b = store.bookings.find(item => item.id === s.booking_id);
  if (!b || (b.kind !== 'private' && b.kind !== 'group')) return null;
  const session = {
    id: s.id,
    booking_id: s.booking_id,
    kind: b.kind as 'private' | 'group',
    status: s.status,
    capacity: s.capacity,
    location_id: b.location_id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    timezone: b.timezone,
    actual_start: s.actual_start,
    actual_end: s.actual_end,
    booking_revision: String(b.revision),
    revision: String(s.revision),
    court: store.courts.find(c => c.id === b.court_id)?.name ?? 'زمین',
    coach: s.coach_id ? store.coaches.find(c => c.id === s.coach_id)?.name ?? null : null,
  };
  const roster = store.participants
    .filter(p => p.session_id === s.id)
    .map(p => ({
      id: p.id,
      student_id: p.student_id,
      name: store.students.find(st => st.id === p.student_id)?.name ?? null,
      withdrawn_at: p.withdrawn_at,
      status: p.attendance,
    }))
    .sort((a, b) => Number(Boolean(a.withdrawn_at)) - Number(Boolean(b.withdrawn_at)) || (a.name ?? '').localeCompare(b.name ?? ''));
  const enrolledIds = new Set(roster.filter(r => !r.withdrawn_at).map(r => r.student_id));
  const students =
    session.status === 'scheduled' && session.kind === 'group'
      ? store.students
          .filter(st => st.status === 'active' && st.locations.includes(session.location_id) && !enrolledIds.has(st.id))
          .map(st => ({ id: st.id, name: st.name }))
      : [];
  return { session, roster, students, history: s.history };
}

export function demoRunClassAction(action: 'class-enroll' | 'class-withdraw' | 'class-attendance', form: URLSearchParams, userId: string, org: string) {
  const store = getDemoStore();
  const sessionId = form.get('session') ?? '';
  const sess = store.sessions.find(s => s.id === sessionId);
  if (!sess) throw new InputError('denied', 403);
  const b = store.bookings.find(item => item.id === sess.booking_id)!;

  if (action === 'class-enroll') {
    const studentId = form.get('student') ?? '';
    const activeCount = store.participants.filter(p => p.session_id === sessionId && !p.withdrawn_at).length;
    if (activeCount >= sess.capacity) throw new InputError('attendance-full', 409);
    store.participants.push({ id: randomUUID(), session_id: sessionId, location_id: sess.location_id, student_id: studentId, withdrawn_at: null, attendance: null });
    sess.revision += 1;
  } else if (action === 'class-withdraw') {
    const partId = form.get('participant') ?? '';
    const part = store.participants.find(p => p.id === partId && p.session_id === sessionId);
    if (part) part.withdrawn_at = new Date();
    sess.revision += 1;
  } else {
    const startIso = calendarDateTime(form.get('start') ?? '');
    const endIso = calendarDateTime(form.get('end') ?? '');
    if (!startIso || !endIso) throw new InputError('attendance-time');
    const actualStart = toBranchDate(startIso, b.timezone);
    const actualEnd = toBranchDate(endIso, b.timezone);
    if (actualStart >= actualEnd) throw new InputError('attendance-time');
    const wasCompleted = sess.status === 'completed';
    sess.status = 'completed';
    sess.actual_start = actualStart;
    sess.actual_end = actualEnd;
    sess.revision += 1;
    for (const [k, v] of form) {
      if (!k.startsWith('attendance.')) continue;
      const pid = k.slice('attendance.'.length);
      if (Object.hasOwn(attendanceStates, v)) {
        const part = store.participants.find(p => p.id === pid && p.session_id === sessionId);
        if (part) part.attendance = v as AttendanceState;
      }
    }
    sess.history.unshift({
      recorded_at: new Date(),
      actor: demoDisplayName(userId),
      corrected: wasCompleted,
      reason: (form.get('reason') ?? '').trim() || null,
    });
  }
  return classesPath(org, sessionId, { saved: '1' });
}

// ---------- Finance & Operations ----------

export function demoFinanceOverview(
  org: string,
  branch: Branch,
  from: string,
  to: string,
  status: InvoiceState | null,
  page: number,
  invoiceNumber: string | null,
) {
  const store = getDemoStore();
  const size = 24;
  const currency = demoCurrency(org);
  const branchInvoices = store.invoices.filter(i => i.location_id === branch.id);

  let invoiced = 0n;
  let received = 0n;
  let refunded = 0n;
  let due = 0n;
  for (const inv of branchInvoices) {
    const day = localDayOf(inv.issued_at, branch.timezone);
    const t = invoiceTotals(store, inv);
    if (!inv.voided_at && day >= from && day < to) invoiced += inv.total_minor;
    due += t.due;
  }
  for (const p of store.payments) {
    if (p.location_id !== branch.id) continue;
    const day = localDayOf(p.effective_at, branch.timezone);
    if (day >= from && day < to) received += p.amount_minor;
  }
  for (const r of store.refunds) {
    if (r.location_id !== branch.id) continue;
    const day = localDayOf(r.effective_at, branch.timezone);
    if (day >= from && day < to) refunded += r.amount_minor;
  }
  const expense = store.expenses
    .filter(e => e.location_id === branch.id && !e.voided_at && e.effective_on >= from && e.effective_on < to)
    .reduce((sum, e) => sum + e.amount_minor, 0n);
  const coach = store.payables
    .filter(p => p.location_id === branch.id && p.paid_at && localDayOf(p.paid_at, branch.timezone) >= from && localDayOf(p.paid_at, branch.timezone) < to)
    .reduce((sum, p) => {
      const adj = store.adjustments.filter(a => a.payable_id === p.id).reduce((s, a) => s + a.delta_minor, 0n);
      return sum + (p.amount_minor ?? 0n) + adj;
    }, 0n);
  const unpaid = store.payables
    .filter(p => p.location_id === branch.id && p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount_minor ?? 0n), 0n);

  const totals = [
    {
      currency,
      invoiced: invoiced.toString(),
      received: received.toString(),
      refunded: refunded.toString(),
      due: due.toString(),
      net: (received - refunded).toString(),
      expense: expense.toString(),
      coach: coach.toString(),
      unpaid: unpaid.toString(),
      operating: (received - refunded - expense - coach).toString(),
    },
  ];

  const filteredRows = branchInvoices
    .filter(inv => {
      if (invoiceNumber) return inv.invoice_number === invoiceNumber;
      const day = localDayOf(inv.issued_at, branch.timezone);
      const t = invoiceTotals(store, inv);
      return day >= from && day < to && (!status || t.status === status);
    })
    .sort((a, b) => b.issued_at.getTime() - a.issued_at.getTime())
    .map(inv => {
      const t = invoiceTotals(store, inv);
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        issued_at: inv.issued_at,
        currency: inv.currency,
        total: inv.total_minor.toString(),
        due: t.due.toString(),
        received: t.received.toString(),
        status: t.status,
        discount: inv.discount_minor.toString(),
      };
    });

  const courtBreakdown = new Map<string, { key: string; title: string; net: bigint }>();
  const coachBreakdown = new Map<string, { key: string; title: string; net: bigint }>();
  for (const inv of branchInvoices) {
    const net = store.payments
      .filter(p => p.invoice_id === inv.id && localDayOf(p.effective_at, branch.timezone) >= from && localDayOf(p.effective_at, branch.timezone) < to)
      .reduce((s, p) => s + p.amount_minor, 0n) -
      store.refunds
        .filter(r => {
          const p = store.payments.find(pay => pay.id === r.payment_id);
          return p?.invoice_id === inv.id && localDayOf(r.effective_at, branch.timezone) >= from && localDayOf(r.effective_at, branch.timezone) < to;
        })
        .reduce((s, r) => s + r.amount_minor, 0n);
    if (net === 0n) continue;
    const items = store.invoiceItems.filter(li => li.invoice_id === inv.id && li.active);
    const singleBookingId = items.length === 1 ? items[0].booking_id : null;
    const booking = singleBookingId ? store.bookings.find(b => b.id === singleBookingId) : null;
    const court = booking ? store.courts.find(c => c.id === booking.court_id) : null;
    const sess = booking ? store.sessions.find(s => s.booking_id === booking.id) : null;
    const coachRec = sess?.coach_id ? store.coaches.find(c => c.id === sess.coach_id) : null;

    const cKey = court?.id ?? 'unassigned';
    const cTitle = court?.name ?? 'تخصیص‌نیافته';
    const curC = courtBreakdown.get(cKey) ?? { key: cKey, title: cTitle, net: 0n };
    curC.net += net;
    courtBreakdown.set(cKey, curC);

    const chKey = coachRec?.id ?? (booking ? 'no-coach' : 'unassigned');
    const chTitle = coachRec?.name ?? (booking ? 'سانس بدون مربی' : 'تخصیص‌نیافته');
    const curCh = coachBreakdown.get(chKey) ?? { key: chKey, title: chTitle, net: 0n };
    curCh.net += net;
    coachBreakdown.set(chKey, curCh);
  }

  const breakdown = [
    ...[...courtBreakdown.values()].map(x => ({ kind: 'court' as const, key: x.key, title: x.title, currency, net: x.net.toString() })),
    ...[...coachBreakdown.values()].map(x => ({ kind: 'coach' as const, key: x.key, title: x.title, currency, net: x.net.toString() })),
  ];

  const slice = filteredRows.slice((page - 1) * size, (page - 1) * size + size + 1);
  return { totals, breakdown, rows: slice.slice(0, size), hasNext: slice.length > size };
}

export function demoFinanceInvoice(invoiceId: string) {
  const store = getDemoStore();
  const inv = store.invoices.find(i => i.id === invoiceId);
  if (!inv) return null;
  const t = invoiceTotals(store, inv);
  const detail = {
    id: inv.id,
    location_id: inv.location_id,
    invoice_number: inv.invoice_number,
    issued_at: inv.issued_at,
    currency: inv.currency,
    total: inv.total_minor.toString(),
    due: t.due.toString(),
    received: t.received.toString(),
    status: t.status,
    discount: inv.discount_minor.toString(),
    discount_reason: inv.discount_reason,
    voided_at: inv.voided_at,
    void_reason: inv.void_reason,
  };
  const items = store.invoiceItems
    .filter(li => li.invoice_id === inv.id)
    .map(li => {
      const b = li.booking_id ? store.bookings.find(item => item.id === li.booking_id) : null;
      const c = b ? store.courts.find(court => court.id === b.court_id) : null;
      const pkg = li.package_id ? store.packages.find(p => p.id === li.package_id) : null;
      const sess = b ? store.sessions.find(s => s.booking_id === b.id) : null;
      const coach = sess?.coach_id ? store.coaches.find(ch => ch.id === sess.coach_id) : null;
      const student = pkg ? store.students.find(st => st.id === pkg.student_id) : null;
      return {
        id: li.id,
        booking_id: li.booking_id,
        package_id: li.package_id,
        package_title: pkg?.title ?? null,
        amount: li.amount_minor.toString(),
        kind: b?.kind ?? null,
        court: c?.name ?? null,
        status: b?.status ?? null,
        name: b?.booker_name ?? coach?.name ?? student?.name ?? null,
        starts_at: b?.starts_at ?? null,
      };
    });
  const payments = store.payments
    .filter(p => p.invoice_id === inv.id)
    .sort((a, b) => b.effective_at.getTime() - a.effective_at.getTime())
    .map(p => {
      const refunded = store.refunds.filter(r => r.payment_id === p.id).reduce((s, r) => s + r.amount_minor, 0n);
      return {
        id: p.id,
        amount: p.amount_minor.toString(),
        available: (p.amount_minor - refunded).toString(),
        method: p.method,
        reference: p.reference,
        effective_at: p.effective_at,
      };
    });
  const paymentIds = new Set(payments.map(p => p.id));
  const refunds = store.refunds
    .filter(r => paymentIds.has(r.payment_id))
    .sort((a, b) => b.effective_at.getTime() - a.effective_at.getTime())
    .map(r => ({
      id: r.id,
      payment_id: r.payment_id,
      amount: r.amount_minor.toString(),
      reason: r.reason,
      effective_at: r.effective_at,
    }));
  return { detail, items, payments, refunds };
}

export function demoTrainingFinance(branch: Branch, page: number, selected?: string, session?: string) {
  const store = getDemoStore();
  const size = 24;
  const students = store.students.filter(s => s.status === 'active' && s.locations.includes(branch.id)).map(s => ({ id: s.id, name: s.name }));
  const allPackages = store.packages
    .filter(p => p.location_id === branch.id && (!selected || p.id === selected))
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .map(p => ({
      id: p.id,
      title: p.title,
      student: store.students.find(s => s.id === p.student_id)?.name ?? null,
      sessions: p.sessions,
      used: store.trainingUses.filter(u => u.package_id === p.id && !u.reversed_at).length,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
      status: p.status,
      invoice_id: p.invoice_id,
    }));

  const slice = allPackages.slice((selected ? 0 : (page - 1) * size), (selected ? 0 : (page - 1) * size) + size + 1);
  if (!selected || !allPackages.length) return { rows: slice.slice(0, size), hasNext: slice.length > size, students, uses: [], eligible: [] };

  const pkg = store.packages.find(p => p.id === selected)!;
  const uses = store.trainingUses
    .filter(u => u.package_id === selected)
    .map(u => {
      const sess = store.sessions.find(s => s.id === u.session_id);
      const b = sess ? store.bookings.find(item => item.id === sess.booking_id) : null;
      return {
        id: u.id,
        session_id: u.session_id,
        day: b ? localDayOf(b.starts_at, branch.timezone) : localDayOf(u.used_at, branch.timezone),
        used_at: u.used_at,
        reversed_at: u.reversed_at,
        reversal_reason: u.reversal_reason,
      };
    });

  const eligible =
    pkg.status === 'active'
      ? store.participants
          .filter(pp => {
            if (pp.student_id !== pkg.student_id || pp.location_id !== branch.id || pp.withdrawn_at) return false;
            if (pp.attendance !== 'present' && pp.attendance !== 'late') return false;
            if (store.trainingUses.some(u => u.participant_id === pp.id && !u.reversed_at)) return false;
            const sess = store.sessions.find(s => s.id === pp.session_id && s.status === 'completed');
            if (!sess || (session && sess.id !== session)) return false;
            const b = store.bookings.find(item => item.id === sess.booking_id && item.status === 'confirmed');
            if (!b) return false;
            const day = localDayOf(b.starts_at, branch.timezone);
            return day >= pkg.valid_from && day <= pkg.valid_until;
          })
          .map(pp => {
            const sess = store.sessions.find(s => s.id === pp.session_id)!;
            const b = store.bookings.find(item => item.id === sess.booking_id)!;
            return {
              id: pp.id,
              court: store.courts.find(c => c.id === b.court_id)?.name ?? 'زمین',
              day: localDayOf(b.starts_at, branch.timezone),
              status: pp.attendance as 'present' | 'late',
            };
          })
      : [];

  return { rows: slice.slice(0, size), hasNext: slice.length > size, students, uses, eligible };
}

export function demoFinanceExpenses(branchId: string, from: string, to: string, page: number) {
  const store = getDemoStore();
  const size = 24;
  const rows = store.expenses
    .filter(e => e.location_id === branchId && e.effective_on >= from && e.effective_on <= to)
    .sort((a, b) => b.effective_on.localeCompare(a.effective_on))
    .map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      currency: e.currency,
      amount: e.amount_minor.toString(),
      method: e.method,
      effective_on: e.effective_on,
      voided_at: e.voided_at,
      void_reason: e.void_reason,
    }));
  const slice = rows.slice((page - 1) * size, (page - 1) * size + size + 1);
  return { rows: slice.slice(0, size), hasNext: slice.length > size };
}

export function demoCoachFinance(branch: Branch, from: string, to: string, page: number, session?: string) {
  const store = getDemoStore();
  const size = 24;
  const rows = store.payables
    .filter(p => {
      if (p.location_id !== branch.id) return false;
      if (session) return p.session_id === session;
      const sess = store.sessions.find(s => s.id === p.session_id);
      const dt = sess?.actual_start;
      if (!dt) return false;
      const day = localDayOf(dt, branch.timezone);
      return day >= from && day <= to;
    })
    .map(p => {
      const sess = store.sessions.find(s => s.id === p.session_id)!;
      const coach = sess.coach_id ? store.coaches.find(c => c.id === sess.coach_id)?.name ?? null : null;
      const adj = store.adjustments.filter(a => a.payable_id === p.id).reduce((s, a) => s + a.delta_minor, 0n);
      const calc = p.basis_minor ?? 8500000n;
      return {
        id: p.id,
        session_id: p.session_id,
        currency: p.currency,
        status: p.status,
        amount: p.amount_minor?.toString() ?? null,
        calculated: calc.toString(),
        basis: p.basis,
        rate: p.rate,
        basis_amount: p.basis_minor?.toString() ?? null,
        coach,
        starts_at: sess.actual_start ?? new Date(),
        paid_at: p.paid_at,
        payment_method: p.payment_method,
        reference: p.reference,
        paid_total: p.paid_at && p.amount_minor !== null ? (p.amount_minor + adj).toString() : null,
      };
    });
  const slice = rows.slice((page - 1) * size, (page - 1) * size + size + 1);
  const pageRows = slice.slice(0, size);
  const ids = new Set(pageRows.map(r => r.id));
  const adjustments = store.adjustments
    .filter(a => ids.has(a.payable_id))
    .map(a => ({ id: a.id, payable_id: a.payable_id, delta: a.delta_minor.toString(), reason: a.reason, effective_at: a.effective_at }));
  return { rows: pageRows, hasNext: slice.length > size, adjustments };
}

export function demoFinanceRates(branchId: string) {
  const store = getDemoStore();
  const activeCourtIds = new Set(store.courts.filter(c => c.location_id === branchId && c.status === 'active').map(c => c.id));
  const rates = store.rates
    .filter(r => r.location_id === branchId && activeCourtIds.has(r.court_id) && !r.until_time)
    .map(r => ({
      id: r.id,
      kind: r.kind,
      court: store.courts.find(c => c.id === r.court_id)?.name ?? 'زمین',
      effective_at: r.from_time,
      unit_minutes: r.unit_minutes,
      amount: r.amount_minor,
    }));
  const rateIds = new Set(rates.map(r => r.id));
  const specials = store.specials
    .filter(s => rateIds.has(s.rate_id))
    .map(s => ({
      id: s.id,
      rate_id: s.rate_id,
      weekday: s.weekday,
      start_minute: s.start_minute,
      end_minute: s.end_minute,
      min_minutes: s.min_minutes,
      max_minutes: s.max_minutes,
      amount: s.amount,
      retired_at: s.retired_at,
    }));
  return { rates, specials };
}

export function demoRunFinanceAction(
  action: FinanceCommandName | 'finance-operation',
  form: URLSearchParams,
  org: string,
): { next?: string; status?: string } {
  const store = getDemoStore();
  const branchId = form.get('branch') ?? '';
  const currency = demoCurrency(org);
  const now = new Date();
  const today = branchDateTime('Asia/Tehran').date;

  if (action === 'finance-operation') {
    return { status: 'unconfirmed' };
  }

  const parseMoneyField = (key = 'amount', optional = false) => {
    const raw = (form.get(key) ?? '').trim();
    if (!raw && optional) return null;
    const parsed = parseMinor(raw || '0', form.get('unit') ?? 'minor', currency);
    if (parsed === null) throw new InputError('finance-amount');
    return parsed;
  };

  if (action === 'finance-issue') {
    const bookingId = form.get('booking') ?? '';
    const b = store.bookings.find(item => item.id === bookingId);
    if (!b) throw new InputError('finance-not-invoiceable', 409);
    const existing = store.invoiceItems.find(i => i.booking_id === bookingId && i.active);
    if (existing) return { next: financePath(org, existing.invoice_id, { saved: '1' }) };
    const discount = parseMoneyField('discount', true) ?? 0n;
    const price = BigInt(b.amount_minor);
    const total = price > discount ? price - discount : 0n;
    const invId = randomUUID();
    store.invoices.push({
      id: invId,
      location_id: b.location_id,
      invoice_number: String(store.nextInvoiceNumber++),
      issued_at: now,
      currency,
      total_minor: total,
      discount_minor: discount,
      discount_reason: (form.get('reason') ?? '').trim() || null,
      voided_at: null,
      void_reason: null,
    });
    store.invoiceItems.push({ id: randomUUID(), location_id: b.location_id, invoice_id: invId, booking_id: bookingId, package_id: null, amount_minor: price, active: true });
    return { next: financePath(org, invId, { saved: '1' }) };
  }

  if (action === 'finance-payment') {
    const invoiceId = form.get('invoice') ?? '';
    const inv = store.invoices.find(i => i.id === invoiceId);
    if (!inv) throw new InputError('denied', 403);
    const amount = parseMoneyField('amount')!;
    const method = (form.get('method') ?? 'card') as keyof typeof paymentMethods;
    store.payments.push({ id: randomUUID(), location_id: inv.location_id, invoice_id: invoiceId, amount_minor: amount, method, reference: (form.get('reference') ?? '').trim() || null, effective_at: now });
    return { next: financePath(org, invoiceId, { saved: '1' }) };
  }

  if (action === 'finance-refund') {
    const invoiceId = form.get('invoice') ?? '';
    const paymentId = form.get('payment') ?? '';
    const amount = parseMoneyField('amount')!;
    const reason = (form.get('reason') ?? '').trim();
    if (!reason) throw new InputError('finance-reason');
    store.refunds.push({ id: randomUUID(), location_id: branchId, payment_id: paymentId, amount_minor: amount, reason, effective_at: now });
    return { next: financePath(org, invoiceId, { saved: '1' }) };
  }

  if (action === 'finance-void') {
    const invoiceId = form.get('invoice') ?? '';
    const inv = store.invoices.find(i => i.id === invoiceId);
    if (!inv) throw new InputError('denied', 403);
    const reason = (form.get('reason') ?? '').trim();
    if (!reason) throw new InputError('finance-reason');
    inv.voided_at = now;
    inv.void_reason = reason;
    return { next: financePath(org, invoiceId, { saved: '1' }) };
  }

  const cfAction = action as ClubFinanceCommand;
  const tab = commandTab(cfAction);
  if (cfAction === 'finance-training-issue') {
    const pkgId = randomUUID();
    const sessionsRaw = (form.get('sessions') ?? '').trim();
    const amount = parseMoneyField('amount', true);
    let invoice_id: string | null = null;
    if (amount && amount > 0n) {
      invoice_id = randomUUID();
      store.invoices.push({ id: invoice_id, location_id: branchId, invoice_number: String(store.nextInvoiceNumber++), issued_at: now, currency, total_minor: amount, discount_minor: 0n, discount_reason: null, voided_at: null, void_reason: null });
      store.invoiceItems.push({ id: randomUUID(), location_id: branchId, invoice_id, booking_id: null, package_id: pkgId, amount_minor: amount, active: true });
    }
    store.packages.push({
      id: pkgId,
      location_id: branchId,
      student_id: form.get('student') ?? '',
      title: (form.get('title') ?? '').trim(),
      sessions: sessionsRaw ? Number(asciiDigits(sessionsRaw)) : null,
      valid_from: asciiDigits(form.get('from') ?? today),
      valid_until: asciiDigits(form.get('until') ?? today),
      status: 'active',
      invoice_id,
      created_at: now,
    });
    return { next: operationsPath(org, branchId, tab, { saved: '1', package: pkgId }) };
  }

  const target = form.get('target') ?? '';
  if (cfAction === 'finance-training-status') {
    const pkg = store.packages.find(p => p.id === target);
    if (pkg) pkg.status = (form.get('status') as 'active' | 'suspended' | 'cancelled') ?? 'suspended';
    return { next: operationsPath(org, branchId, tab, { saved: '1', package: target }) };
  }
  if (cfAction === 'finance-training-redeem') {
    const partId = form.get('participant') ?? '';
    const part = store.participants.find(p => p.id === partId);
    if (part) {
      store.trainingUses.push({ id: randomUUID(), location_id: branchId, package_id: target, participant_id: partId, session_id: part.session_id, used_at: now, reversed_at: null, reversal_reason: null });
    }
    return { next: operationsPath(org, branchId, tab, { saved: '1', package: target }) };
  }
  if (cfAction === 'finance-training-return') {
    const use = store.trainingUses.find(u => u.id === target);
    if (use) {
      use.reversed_at = now;
      use.reversal_reason = (form.get('reason') ?? '').trim();
    }
    return { next: operationsPath(org, branchId, tab, { saved: '1', package: use?.package_id ?? '' }) };
  }
  if (cfAction === 'finance-expense-record') {
    store.expenses.push({
      id: randomUUID(),
      location_id: branchId,
      title: (form.get('title') ?? '').trim(),
      category: (form.get('category') as keyof typeof expenseCategories) ?? 'other',
      currency,
      amount_minor: parseMoneyField('amount')!,
      method: (form.get('method') as keyof typeof paymentMethods) ?? 'card',
      effective_on: asciiDigits(form.get('day') ?? today),
      voided_at: null,
      void_reason: null,
    });
    return { next: operationsPath(org, branchId, tab, { saved: '1' }) };
  }
  if (cfAction === 'finance-expense-void') {
    const exp = store.expenses.find(e => e.id === target);
    if (exp) {
      exp.voided_at = now;
      exp.void_reason = (form.get('reason') ?? '').trim();
    }
    return { next: operationsPath(org, branchId, tab, { saved: '1' }) };
  }
  if (cfAction === 'finance-coach-approve' || cfAction === 'finance-coach-correct' || cfAction === 'finance-coach-pay' || cfAction === 'finance-coach-adjust') {
    const payable = store.payables.find(p => p.id === target);
    if (payable) {
      if (cfAction === 'finance-coach-approve' || cfAction === 'finance-coach-correct') {
        payable.status = 'approved';
        payable.amount_minor = parseMoneyField('amount')!;
        payable.approved_at = now;
      } else if (cfAction === 'finance-coach-pay') {
        payable.status = 'paid';
        payable.paid_at = now;
        payable.payment_method = (form.get('method') as keyof typeof paymentMethods) ?? 'transfer';
        payable.reference = (form.get('reference') ?? '').trim() || null;
      } else {
        store.adjustments.push({ id: randomUUID(), location_id: branchId, payable_id: target, delta_minor: parseMoneyField('amount')!, reason: (form.get('reason') ?? '').trim(), effective_at: now });
      }
    }
    return { next: operationsPath(org, branchId, tab, { saved: '1', session: payable?.session_id ?? '' }) };
  }
  if (cfAction === 'finance-rate-special') {
    const startMin = parseMinuteStr(form.get('start') ?? '08:00');
    const endMin = parseMinuteStr(form.get('end') ?? '20:00');
    store.specials.push({
      id: randomUUID(),
      location_id: branchId,
      rate_id: target,
      weekday: Number(asciiDigits(form.get('weekday') ?? '1')),
      start_minute: startMin,
      end_minute: endMin,
      min_minutes: Number(asciiDigits(form.get('minimum') ?? '60')),
      max_minutes: Number(asciiDigits(form.get('maximum') ?? '180')),
      amount: (parseMoneyField('amount') ?? 0n).toString(),
      retired_at: null,
    });
  } else if (cfAction === 'finance-rate-retire') {
    const spec = store.specials.find(s => s.id === target);
    if (spec) spec.retired_at = now;
  }
  return { next: operationsPath(org, branchId, tab, { saved: '1' }) };
}

// ---------- Reports ----------

function buildDemoReportPeriod(branchIds: string[], scope: ReportScope, range: DateRange, entityId?: string): ReportData {
  const store = getDemoStore();
  const branchSet = new Set(branchIds);

  const matchBooking = (b: DemoBooking) => {
    if (!branchSet.has(b.location_id)) return false;
    const day = localDayOf(b.starts_at, b.timezone);
    if (day < range.start || day >= range.end) return false;
    if (scope === 'court' && b.court_id !== entityId) return false;
    const sess = store.sessions.find(s => s.booking_id === b.id);
    if (scope === 'coach' && sess?.coach_id !== entityId) return false;
    if (scope === 'student' && (!sess || !store.participants.some(p => p.session_id === sess.id && p.student_id === entityId && !p.withdrawn_at))) {
      return false;
    }
    return true;
  };

  const bookings: ReportBooking[] = store.bookings
    .filter(matchBooking)
    .map(b => ({
      id: b.id,
      kind: b.kind,
      status: b.status,
      branch: branchName(store, b.location_id),
      court: store.courts.find(c => c.id === b.court_id)?.name ?? 'زمین',
      day: localDayOf(b.starts_at, b.timezone),
      time: localTimeOf(b.starts_at, b.timezone),
      starts_in_period: true,
      minutes: Math.round((b.ends_at.getTime() - b.starts_at.getTime()) / 60000),
    }));

  const sessions: ReportSession[] = store.sessions
    .filter(s => {
      const b = store.bookings.find(item => item.id === s.booking_id);
      return b ? matchBooking(b) : false;
    })
    .map(s => {
      const b = store.bookings.find(item => item.id === s.booking_id)!;
      const actualMin = s.actual_start && s.actual_end ? Math.round((s.actual_end.getTime() - s.actual_start.getTime()) / 60000) : 0;
      const actualDay = s.actual_start ? localDayOf(s.actual_start, b.timezone) : null;
      return {
        id: s.id,
        booking_id: s.booking_id,
        status: s.status,
        branch: branchName(store, b.location_id),
        court: store.courts.find(c => c.id === b.court_id)?.name ?? 'زمین',
        coach: s.coach_id ? store.coaches.find(c => c.id === s.coach_id)?.name ?? null : null,
        planned: true,
        completed: s.status === 'completed',
        planned_day: localDayOf(b.starts_at, b.timezone),
        actual_day: actualDay,
        minutes: s.status === 'completed' ? actualMin : 0,
      };
    });

  const completedIds = new Set(sessions.filter(s => s.completed).map(s => s.id));
  const people = store.participants
    .filter(p => !p.withdrawn_at && completedIds.has(p.session_id) && (scope !== 'student' || p.student_id === entityId))
    .map(p => ({
      id: p.id,
      session_id: p.session_id,
      student_id: p.student_id,
      student: store.students.find(st => st.id === p.student_id)?.name ?? null,
      status: p.attendance,
    }));

  const new_students =
    scope === 'club'
      ? store.students
          .filter(s => {
            if (!s.locations.some(loc => branchSet.has(loc))) return false;
            const d = localDayOf(s.created_at, 'Asia/Tehran');
            return d >= range.start && d < range.end;
          })
          .map(s => ({ id: s.id, name: s.name, day: localDayOf(s.created_at, 'Asia/Tehran') }))
      : [];

  const capacity: ReportData['capacity'] = [];
  const blocks: ReportData['blocks'] = [];
  if (scope === 'club' || scope === 'court') {
    const activeCourts = store.courts.filter(c => branchSet.has(c.location_id) && (scope !== 'court' || c.id === entityId));
    for (let day = range.start; day < range.end; day = addDays(day, 1)) {
      for (const c of activeCourts) {
        const dayBookings = bookings.filter(b => b.court === c.name && b.day === day && b.status === 'confirmed');
        const dayActual = sessions.filter(s => s.court === c.name && s.actual_day === day && s.completed);
        const dayBlocks = store.blocks.filter(bl => bl.court_id === c.id && !bl.released_at && localDayOf(bl.starts_at) === day);
        const blocked = dayBlocks.reduce((s, bl) => s + Math.round((bl.ends_at.getTime() - bl.starts_at.getTime()) / 60000), 0);
        const available = c.status === 'active' ? 840 - blocked : 0;
        const inactive = c.status === 'active' ? 0 : 840;
        const occupied = dayBookings.reduce((s, b) => s + b.minutes, 0);
        const actual = dayActual.reduce((s, x) => s + x.minutes, 0);
        if (occupied > 0 || actual > 0 || blocked > 0 || day === branchDateTime('Asia/Tehran').date) {
          capacity.push({ id: c.id, branch: branchName(store, c.location_id), court: c.name, day, available, blocked, inactive, occupied, actual });
        }
      }
    }
    for (const bl of store.blocks) {
      if (!branchSet.has(bl.location_id) || bl.released_at) continue;
      if (scope === 'court' && bl.court_id !== entityId) continue;
      const day = localDayOf(bl.starts_at);
      if (day >= range.start && day < range.end) {
        blocks.push({
          id: bl.id,
          branch: branchName(store, bl.location_id),
          court: store.courts.find(c => c.id === bl.court_id)?.name ?? null,
          kind: 'maintenance',
          reason: bl.reason,
          starts: `${day} ${localTimeOf(bl.starts_at)}`,
          ends: `${localDayOf(bl.ends_at)} ${localTimeOf(bl.ends_at)}`,
        });
      }
    }
  }

  const coachTime: ReportData['coachTime'] =
    scope === 'coach'
      ? {
          available: 3120,
          actual: sessions.reduce((s, x) => s + x.minutes, 0),
          occupied: sessions.reduce((s, x) => s + x.minutes, 0),
          spans: sessions
            .filter(s => s.completed)
            .map(s => ({ kind: 'actual' as const, start: `${s.actual_day}T10:00:00Z`, end: `${s.actual_day}T11:00:00Z`, minutes: s.minutes })),
        }
      : null;

  let student: ReportData['student'] = null;
  if (scope === 'student' && entityId) {
    const st = store.students.find(s => s.id === entityId);
    if (st) {
      const visits = store.participants
        .filter(p => p.student_id === st.id && (p.attendance === 'present' || p.attendance === 'late'))
        .map(p => store.sessions.find(s => s.id === p.session_id && s.status === 'completed')?.actual_start ?? null)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime());
      student = {
        skill_level: st.skill_level,
        last_at: visits[0] ?? null,
        last_timezone: 'Asia/Tehran',
        changes: st.level_changes,
        packages: store.packages
          .filter(p => p.student_id === st.id && branchSet.has(p.location_id))
          .map(p => ({
            id: p.id,
            title: p.title,
            branch: branchName(store, p.location_id),
            valid_from: p.valid_from,
            valid_until: p.valid_until,
            status: p.status,
            sessions: p.sessions,
            used: store.trainingUses.filter(u => u.package_id === p.id && !u.reversed_at).length,
          })),
      };
    }
  }

  const money: ReportData['money'] = [];
  for (const p of store.payments) {
    if (!branchSet.has(p.location_id)) continue;
    const day = localDayOf(p.effective_at);
    if (day < range.start || day >= range.end) continue;
    const inv = store.invoices.find(i => i.id === p.invoice_id);
    money.push({ id: p.id, source_id: p.invoice_id, reference: inv?.invoice_number ?? null, kind: 'receipt', branch: branchName(store, p.location_id), currency: 'IRR', amount: p.amount_minor.toString(), day, allocation: 'booking' });
  }
  for (const r of store.refunds) {
    if (!branchSet.has(r.location_id)) continue;
    const day = localDayOf(r.effective_at);
    if (day < range.start || day >= range.end) continue;
    const pay = store.payments.find(p => p.id === r.payment_id);
    const inv = pay ? store.invoices.find(i => i.id === pay.invoice_id) : null;
    money.push({ id: r.id, source_id: inv?.id ?? null, reference: inv?.invoice_number ?? null, kind: 'refund', branch: branchName(store, r.location_id), currency: 'IRR', amount: (-r.amount_minor).toString(), day, allocation: 'booking' });
  }
  for (const inv of store.invoices) {
    if (!branchSet.has(inv.location_id) || inv.voided_at) continue;
    const t = invoiceTotals(store, inv);
    if (t.due > 0n) {
      money.push({ id: inv.id, source_id: inv.id, reference: inv.invoice_number, kind: 'balance', branch: branchName(store, inv.location_id), currency: inv.currency, amount: t.due.toString(), day: addDays(range.end, -1), allocation: 'booking' });
    }
  }
  if (scope === 'club') {
    for (const e of store.expenses) {
      if (!branchSet.has(e.location_id) || e.voided_at || e.effective_on < range.start || e.effective_on >= range.end) continue;
      money.push({ id: e.id, source_id: null, reference: e.title, kind: 'expense', branch: branchName(store, e.location_id), currency: e.currency, amount: e.amount_minor.toString(), day: e.effective_on, allocation: null });
    }
  }
  if (scope === 'club' || scope === 'coach') {
    for (const py of store.payables) {
      if (!branchSet.has(py.location_id)) continue;
      const sess = store.sessions.find(s => s.id === py.session_id);
      if (scope === 'coach' && sess?.coach_id !== entityId) continue;
      if (py.paid_at && localDayOf(py.paid_at) >= range.start && localDayOf(py.paid_at) < range.end) {
        money.push({ id: py.id, source_id: py.session_id, reference: null, kind: 'wage', branch: branchName(store, py.location_id), currency: py.currency, amount: (py.amount_minor ?? 0n).toString(), day: localDayOf(py.paid_at), allocation: null });
      } else if (py.status === 'approved') {
        money.push({ id: py.id, source_id: py.session_id, reference: null, kind: 'wage_due', branch: branchName(store, py.location_id), currency: py.currency, amount: (py.amount_minor ?? 0n).toString(), day: addDays(range.end, -1), allocation: null });
      }
    }
  }

  return { range, bookings, sessions, people, new_students, capacity, blocks, coachTime, money, student };
}

export function demoLoadReport(
  branchIds: string[],
  scope: ReportScope,
  range: { current: DateRange; previous: DateRange } | null,
  filters: { entity: string },
  compare: boolean,
) {
  const store = getDemoStore();
  let entities: ReportEntity[] = [];
  if (scope === 'court') entities = store.courts.map(c => ({ id: c.id, name: c.name, locations: [c.location_id] }));
  else if (scope === 'coach') entities = store.coaches.map(c => ({ id: c.id, name: c.name, locations: c.locations }));
  else if (scope === 'student') entities = store.students.map(s => ({ id: s.id, name: s.name, locations: s.locations }));

  const entity = entities.find(item => item.id === filters.entity && item.locations.some(loc => branchIds.includes(loc)));
  if (!branchIds.length || !range || (scope !== 'club' && !entity)) {
    return { entities, entity, current: null, previous: null };
  }
  const current = buildDemoReportPeriod(branchIds, scope, range.current, entity?.id);
  const previous = compare ? buildDemoReportPeriod(branchIds, scope, range.previous, entity?.id) : null;
  return { entities, entity, current, previous };
}

// ---------- Notifications ----------

export function demoReadNotices(branch: string | null, page: number) {
  const store = getDemoStore();
  const size = 24;
  const rows = store.notices
    .filter(n => !branch || n.location_id === branch)
    .sort((a, b) => b.available_at.getTime() - a.available_at.getTime())
    .map(n => ({
      id: n.id,
      kind: n.kind,
      source_id: n.source_id,
      location_id: n.location_id,
      branch: branchName(store, n.location_id),
      timezone: branchOf(store, n.location_id)?.timezone ?? 'Asia/Tehran',
      available_at: n.available_at,
      read_at: store.readNoticeIds.has(n.id) ? new Date() : null,
    }));
  const slice = rows.slice((page - 1) * size, (page - 1) * size + size + 1);
  return { notices: slice.slice(0, size), hasNext: slice.length > size };
}

export function demoMarkNotices(branch: string | null, event: string | null) {
  const store = getDemoStore();
  if (event) {
    if (!store.notices.some(n => n.id === event)) throw new InputError('denied', 404);
    store.readNoticeIds.add(event);
    return;
  }
  for (const n of store.notices) {
    if (!branch || n.location_id === branch) store.readNoticeIds.add(n.id);
  }
}
