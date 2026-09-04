import type {
  ExecutionResult,
  ProblemContext,
  SessionEvent,
} from '@cue/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { neetcodeAdapter } from '../platform/neetcode';
import {
  appendSessionEvent,
  createSession,
  endSession,
} from '../services/sessionApi';
import { listenForSpeech } from '../speech/listenForSpeech';

export type InterviewSessionState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'live'; sessionId: string; paused: boolean }
  | { status: 'ending'; sessionId: string }
  | { status: 'ended'; sessionId: string }
  | { status: 'error'; message: string };

function stopStream(stream: MediaStream | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

function setStreamEnabled(stream: MediaStream | undefined, enabled: boolean) {
  stream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function useInterviewSession() {
  const [state, setState] = useState<InterviewSessionState>({ status: 'idle' });
  const streamRef = useRef<MediaStream | undefined>(undefined);

  const start = useCallback(async (problem: ProblemContext) => {
    setState({ status: 'starting' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { sessionId } = await createSession(problem);
      setState({ status: 'live', sessionId, paused: false });
    } catch (error) {
      stopStream(streamRef.current);
      streamRef.current = undefined;
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'NotFoundError');
      setState({
        status: 'error',
        message: denied
          ? 'Microphone access is required to start'
          : error instanceof Error
            ? error.message
            : 'Failed to start interview',
      });
    }
  }, []);

  const end = useCallback(async () => {
    if (state.status !== 'live') return;

    const sessionId = state.sessionId;
    setState({ status: 'ending', sessionId });
    stopStream(streamRef.current);
    streamRef.current = undefined;

    try {
      await endSession(sessionId);
    } catch (error) {
      console.warn('[cue] failed to end session on the server', error);
    }

    setState({ status: 'ended', sessionId });
  }, [state]);

  const togglePause = useCallback(() => {
    setState((current) => {
      if (current.status !== 'live') return current;
      const paused = !current.paused;
      setStreamEnabled(streamRef.current, !paused);
      return { ...current, paused };
    });
  }, []);

  useEffect(() => {
    if (state.status !== 'live' || state.paused) return;

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

  useEffect(() => {
    if (state.status !== 'live' || state.paused) return;

    const sessionId = state.sessionId;
    try {
      const stopListening = listenForSpeech((transcript) => {
        void appendSessionEvent(sessionId, {
          type: 'speech',
          timestamp: Date.now(),
          transcript,
        }).catch((error: unknown) => {
          console.warn('[cue] failed to append speech event', error);
        });
      });

      return () => {
        stopListening();
      };
    } catch (error) {
      console.warn('[cue] speech recognition unavailable', error);
      return undefined;
    }
  }, [state]);

  return { state, start, end, togglePause };
}
