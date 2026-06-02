import { useEffect, useRef } from 'react';
import { CURRENT_SEMESTER, getCurrentWeekType, startOfLocalSundayWeek } from '@/lib/schedule-data';

/** When local Sunday week rolls (Sat→Sun midnight), apply new even/odd. Manual toggle within same week kept. */
export function useSyncScheduleWeekType(setWeekType: (t: 'even' | 'odd') => void, enabled = true) {
  const sundayMsRef = useRef(startOfLocalSundayWeek(new Date()).getTime());

  useEffect(() => {
    if (!enabled) return;
    const bumpIfNewWeek = () => {
      const cur = startOfLocalSundayWeek(new Date()).getTime();
      if (cur !== sundayMsRef.current) {
        sundayMsRef.current = cur;
        setWeekType(getCurrentWeekType(CURRENT_SEMESTER));
      }
    };
    bumpIfNewWeek();
    const id = window.setInterval(bumpIfNewWeek, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') bumpIfNewWeek();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, setWeekType]);
}
