import { useEffect, useState } from 'react';
import { Gauge, Users, Ticket, Power } from 'lucide-react';
import {
  DEMO_LIMITS_CHANGED,
  DEMO_MAX_ACTIVE_TICKETS,
  DEMO_MAX_PARTICIPANTS_PER_TICKET,
  isDemoTicketLimitsEnabled,
  remainingDemoTicketSlots,
  setDemoTicketLimitsEnabled,
} from '../services/ticketDemoLimits';

type Props = {
  /** Count of non-terminated / non-cancelled tickets (same rule as generator cap). */
  issuedTowardCap: number;
  /** Smaller layout for generator sidebar */
  compact?: boolean;
};

export function TicketDemoLimitWidget({ issuedTowardCap, compact }: Props) {
  const envLimitsOff =
    import.meta.env.VITE_TICKET_DEMO_LIMITS === 'false' || import.meta.env.VITE_TICKET_DEMO_LIMITS === '0';
  const [enabled, setEnabled] = useState(() => isDemoTicketLimitsEnabled());

  useEffect(() => {
    const sync = () => setEnabled(isDemoTicketLimitsEnabled());
    window.addEventListener(DEMO_LIMITS_CHANGED, sync);
    return () => window.removeEventListener(DEMO_LIMITS_CHANGED, sync);
  }, []);

  const remaining = remainingDemoTicketSlots(issuedTowardCap);
  const pct = Math.min(100, (issuedTowardCap / DEMO_MAX_ACTIVE_TICKETS) * 100);
  const atCap = enabled && issuedTowardCap >= DEMO_MAX_ACTIVE_TICKETS;

  if (envLimitsOff) {
    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-bold text-slate-800">Ticket demo limits</p>
        <p className="mt-1 text-xs">Disabled via <code className="rounded bg-white px-1">VITE_TICKET_DEMO_LIMITS=false</code>.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-slate-900 bg-gradient-to-br from-amber-50 to-orange-50 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-200 border-2 border-slate-900 p-2">
            <Gauge className="text-amber-900" size={compact ? 20 : 24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/80">Demo rate limiter</p>
            <p className={`font-black text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>Ticket issuance cap</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !enabled;
            setDemoTicketLimitsEnabled(next);
            setEnabled(next);
          }}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-slate-900 px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors ${
            enabled ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'
          }`}
          title="Toggle demo ticket caps for evaluation"
        >
          <Power size={12} />
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {!enabled ? (
        <p className="mt-3 text-xs font-medium text-slate-600">Limits are off. Turn on to enforce demo caps at the gate.</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1">
                <Ticket size={14} className="text-slate-600" />
                Active tickets
              </span>
              <span className={atCap ? 'text-red-600' : 'text-slate-900'}>
                {issuedTowardCap} / {DEMO_MAX_ACTIVE_TICKETS}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-white">
              <div
                className={`h-full transition-all ${atCap ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] font-medium text-slate-600">
              {atCap
                ? 'Cap reached — terminate cancelled tickets to free slots, or turn limits off for testing.'
                : `${remaining} slot${remaining === 1 ? '' : 's'} left before demo cap.`}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-slate-900/20 bg-white/70 px-3 py-2">
            <Users size={16} className="text-slate-700 shrink-0" />
            <p className="text-[11px] font-bold text-slate-800">
              Max <span className="text-amber-700">{DEMO_MAX_PARTICIPANTS_PER_TICKET}</span> participants per ticket in demo mode
            </p>
          </div>
        </>
      )}
    </div>
  );
}
