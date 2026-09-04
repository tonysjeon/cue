import type { ProblemContext } from '@cue/shared';
import { useEffect, useState } from 'react';
import { neetcodeAdapter } from '../platform/neetcode';

type DetectionState =
  | { status: 'loading'; problem: null }
  | { status: 'ready'; problem: ProblemContext }
  | { status: 'unavailable'; problem: null };

export function useProblemContext(): DetectionState {
  const [state, setState] = useState<DetectionState>({
    status: 'loading',
    problem: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const problem = await neetcodeAdapter.getProblem();
        if (active) setState({ status: 'ready', problem });
      } catch {
        if (active) setState({ status: 'unavailable', problem: null });
      }
    };

    void load();
    const stopObserving = neetcodeAdapter.observeContextChanges((problem) => {
      if (active) setState({ status: 'ready', problem });
    });

    return () => {
      active = false;
      stopObserving();
    };
  }, []);

  return state;
}
