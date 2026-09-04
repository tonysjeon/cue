import type { ProblemContext, SessionEvent } from '@cue/shared';

type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  return browser.runtime.sendMessage({
    type: 'cue-api',
    method,
    path,
    body,
  });
}

export async function createSession(
  problem: ProblemContext,
): Promise<{ sessionId: string }> {
  const response = await request<{ sessionId: string }>(
    'POST',
    '/sessions',
    problem,
  );

  if (!response.ok || !response.data?.sessionId) {
    throw new Error(
      response.error ?? `Failed to create session (${response.status})`,
    );
  }

  return response.data;
}

export async function endSession(sessionId: string): Promise<void> {
  const response = await request('POST', `/sessions/${sessionId}/end`);

  if (!response.ok) {
    throw new Error(
      response.error ?? `Failed to end session (${response.status})`,
    );
  }
}

export async function appendSessionEvent(
  sessionId: string,
  event: SessionEvent,
): Promise<void> {
  const response = await request(
    'POST',
    `/sessions/${sessionId}/events`,
    event,
  );

  if (!response.ok) {
    throw new Error(
      response.error ?? `Failed to append session event (${response.status})`,
    );
  }
}
