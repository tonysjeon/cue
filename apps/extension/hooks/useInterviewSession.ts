import type {
  ExecutionResult,
  ProblemContext,
  SessionEvent,
} from '@cue/shared';
import { useCallback, useEffect, useState } from 'react';
import { neetcodeAdapter } from '../platform/neetcode';
import {
  appendSessionEvent,
  createSession,
  endSession,
} from '../services/sessionApi';

type InterviewSessionState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'live'; sessionId: string }
  | { status: 'ending'; sessionId: string }
  | { status: 'ended'; sessionId: string }
  | { status: 'error'; message: string };

export function useInterviewSession() {
  const [state, setState] = useState<InterviewSessionState>({ status: 'idle' });

  const start = useCallback(async (problem: ProblemContext) => {
    setState({ status: 'starting' });

    try {
      const { sessionId } = await createSession(problem);
      setState({ status: 'live', sessionId });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to start interview',
      });
    }
  }, []);

  const end = useCallback(async () => {
    if (state.status !== 'live') return;

    const sessionId = state.sessionId;
    setState({ status: 'ending', sessionId });

    try {
      await endSession(sessionId);
    } catch (error) {
      console.warn('[cue] failed to end session on the server', error);
    }

    setState({ status: 'ended', sessionId });
  }, [state]);

  useEffect(() => {
    if (state.status !== 'live') return;

    const sessionId = state.sessionId;
    const send = (event: SessionEvent) => {
      void appendSessionEvent(sessionId, event).catch((error: unknown) => {
        console.warn('[cue] failed to append session event', error);
      });
    };

    const stopCode = neetcodeAdapter.observeCodeChanges((code) => {
      send({ type: 'code', timestamp: Date.now(), code });
    });
    const stopRun = neetcodeAdapter.observeRun((result: ExecutionResult) => {
      send({ type: 'run', timestamp: Date.now(), result });
    });
    const stopSubmit = neetcodeAdapter.observeSubmission(
      (result: ExecutionResult) => {
        send({ type: 'submission', timestamp: Date.now(), result });
      },
    );

    return () => {
      stopCode();
      stopRun();
      stopSubmit();
    };
  }, [state]);

  return { state, start, end };
}
