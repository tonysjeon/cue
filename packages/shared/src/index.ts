export interface ProblemContext {
  platform: 'neetcode';
  title: string;
  description: string;
  constraints: string[];
  examples: string[];
  language: string;
  code: string;
}

export type ExecutionResult =
  'PASSED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'UNKNOWN';

export type SessionEvent =
  | { type: 'speech'; timestamp: number; transcript: string }
  | { type: 'code'; timestamp: number; code: string }
  | { type: 'run'; timestamp: number; result: ExecutionResult }
  | { type: 'submission'; timestamp: number; result: ExecutionResult }
  | { type: 'interviewer'; timestamp: number; message: string };
