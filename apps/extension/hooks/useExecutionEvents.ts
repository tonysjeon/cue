import type { ExecutionResult, SessionEvent } from '@cue/shared';
import { useEffect, useState } from 'react';
import { neetcodeAdapter } from '../platform/neetcode';

const MAX_EVENTS = 8;

export type ExecutionEvent = Extract<
  SessionEvent,
  { type: 'run' | 'submission' }
>;

export function useExecutionEvents(): ExecutionEvent[] {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);

  useEffect(() => {
    const append = (type: ExecutionEvent['type'], result: ExecutionResult) => {
      const event: ExecutionEvent = {
        type,
        result,
        timestamp: Date.now(),
      };
      if (import.meta.env.COMMAND === 'serve') {
        console.info('[cue]', event);
      }
      setEvents((current) => [event, ...current].slice(0, MAX_EVENTS));
    };

    const stopRun = neetcodeAdapter.observeRun((result) => {
      append('run', result);
    });
    const stopSubmit = neetcodeAdapter.observeSubmission((result) => {
      append('submission', result);
    });

    return () => {
      stopRun();
      stopSubmit();
    };
  }, []);

  return events;
}
