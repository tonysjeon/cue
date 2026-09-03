export interface ProblemContext {
  platform: 'neetcode';
  title: string;
  description: string;
  constraints: string[];
  examples: string[];
  language: string;
  code: string;
}

export type SessionEvent =
  | { type: 'speech'; timestamp: number; transcript: string }
  | { type: 'code'; timestamp: number; code: string }
  | { type: 'run'; timestamp: number; result: string }
  | { type: 'submission'; timestamp: number; result: string }
  | { type: 'interviewer'; timestamp: number; message: string };
