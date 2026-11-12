// Punch in/out (with GPS) and the running shift time.
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmService } from '../services';
import { quickLocation } from './location';
import type { SalesmanHome } from '../types';

/** Toggle punch; sends the current position when available. */
export function usePunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => crmService.togglePunch(await quickLocation()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
  });
}

/** Current time, refreshed every second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Total time worked today, including the open shift (ticks every second while punched in). */
export function useWorkedMs(home: SalesmanHome | undefined): number {
  const open = home?.punchedInAt ?? null;
  const now = useNow(!!open);
  if (!home) return 0;
  return (home.workedMs || 0) + (open ? Math.max(0, now - Date.parse(open)) : 0); // || 0: older API
}
