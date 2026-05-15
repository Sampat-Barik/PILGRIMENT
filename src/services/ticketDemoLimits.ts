/** Demo / evaluation caps for ticket issuance (not a server-side rate limit). */

export const DEMO_MAX_ACTIVE_TICKETS = 20;
export const DEMO_MAX_PARTICIPANTS_PER_TICKET = 10;

const LS_KEY = 'pilgriment_ticket_demo_limits';
export const DEMO_LIMITS_CHANGED = 'pilgriment-ticket-demo-limits';

/** When `VITE_TICKET_DEMO_LIMITS` is `false`, limits are off regardless of localStorage. */
export function isDemoTicketLimitsEnabled(): boolean {
  if (import.meta.env.VITE_TICKET_DEMO_LIMITS === 'false' || import.meta.env.VITE_TICKET_DEMO_LIMITS === '0') {
    return false;
  }
  const ls = localStorage.getItem(LS_KEY);
  if (ls === 'off') return false;
  if (ls === 'on') return true;
  return true;
}

export function setDemoTicketLimitsEnabled(on: boolean): void {
  localStorage.setItem(LS_KEY, on ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent(DEMO_LIMITS_CHANGED, { detail: { on } }));
}

export function countTicketsTowardDemoCap(tickets: { status?: string }[]): number {
  return tickets.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return s !== 'terminated' && s !== 'cancelled';
  }).length;
}

export function remainingDemoTicketSlots(issuedTowardCap: number): number {
  return Math.max(0, DEMO_MAX_ACTIVE_TICKETS - issuedTowardCap);
}

export function clampParticipantsForDemo(count: number): number {
  if (!isDemoTicketLimitsEnabled()) return Math.max(1, count);
  return Math.min(DEMO_MAX_PARTICIPANTS_PER_TICKET, Math.max(1, count));
}
