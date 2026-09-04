import type { ExecutionResult, ProblemContext } from '@cue/shared';

const SELECTORS = {
  title: 'h1.problem-title',
  article: 'main.neeter-article-content',
  language: 'button.editor-language-btn',
  editor: 'textarea[aria-label="Code editor"]',
  run: 'button.run-btn, #run-button',
  submit: 'button.submit-btn',
  outputTab: 'app-output-tab',
  resultStatus:
    'app-output-tab .submission-result-accepted, app-output-tab .submission-result-wrong',
} as const;

type ExecutionKind = 'run' | 'submission';
type ExecutionCallback = (result: ExecutionResult) => void;

const normalizeText = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim() ?? '';

export function normalizeExecutionResult(description: string): ExecutionResult {
  const text = description.toLowerCase().trim();

  if (!text) return 'UNKNOWN';
  if (text === 'accepted' || text.startsWith('accepted')) return 'PASSED';
  if (text.includes('wrong answer')) return 'WRONG_ANSWER';
  if (text.includes('time limit') || text.includes('timed out')) {
    return 'TIME_LIMIT';
  }
  if (
    text.includes('runtime error') ||
    text.includes('compilation') ||
    text.includes('syntax error') ||
    text.includes('nameerror') ||
    text.includes('typeerror') ||
    text.includes('indexerror')
  ) {
    return 'RUNTIME_ERROR';
  }

  return 'UNKNOWN';
}

async function waitForElement<T extends Element>(
  selector: string,
  timeoutMs = 10_000,
): Promise<T> {
  const existing = document.querySelector<T>(selector);
  if (existing) return existing;

  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timed out waiting for ${selector}`));
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(selector);
      if (!element) return;

      window.clearTimeout(timeout);
      observer.disconnect();
      resolve(element);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function parseDescription(article: HTMLElement): string {
  const paragraphs = Array.from(article.querySelectorAll('p'));
  const description: string[] = [];

  for (const paragraph of paragraphs) {
    const text = normalizeText(paragraph.textContent);
    if (/^(Example|Constraints):?/i.test(text)) break;
    if (text) description.push(text);
  }

  return description.join('\n\n');
}

function parseExamples(article: HTMLElement): string[] {
  return Array.from(article.querySelectorAll('code'))
    .map((element) => normalizeText(element.textContent))
    .filter((text) => /^Input:/i.test(text));
}

function parseConstraints(article: HTMLElement): string[] {
  const marker = Array.from(article.querySelectorAll('strong')).find(
    (element) => /^Constraints:?$/i.test(normalizeText(element.textContent)),
  );
  const list = marker?.closest('p')?.nextElementSibling;

  if (!list?.matches('ul, ol')) return [];

  return Array.from(list.querySelectorAll('li'))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);
}

function readEditorValue(editor: HTMLTextAreaElement): string {
  return editor.value;
}

function buttonLabel(selector: string): string {
  return normalizeText(document.querySelector(selector)?.textContent);
}

function isBusyLabel(label: string, kind: ExecutionKind): boolean {
  if (kind === 'run') return /^running/i.test(label);
  return /^submitting/i.test(label);
}

function readPlatformStatus(): string {
  return normalizeText(
    document.querySelector(SELECTORS.resultStatus)?.textContent,
  );
}

function closestExecutionControl(
  target: EventTarget | null,
): ExecutionKind | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(SELECTORS.run)) return 'run';
  if (target.closest(SELECTORS.submit)) return 'submission';
  return null;
}

export interface NeetCodeAdapter {
  getProblem(): Promise<ProblemContext>;
  getCode(): Promise<string>;
  getLanguage(): Promise<string>;
  observeCodeChanges(callback: (code: string) => void): () => void;
  observeRun(callback: ExecutionCallback): () => void;
  observeSubmission(callback: ExecutionCallback): () => void;
}

class BrowserNeetCodeAdapter implements NeetCodeAdapter {
  private runListeners = new Set<ExecutionCallback>();
  private submissionListeners = new Set<ExecutionCallback>();
  private executionObserver: MutationObserver | undefined;
  private stopExecutionListeners: (() => void) | undefined;
  private pendingKind: ExecutionKind | undefined;
  private pendingStartedAt = 0;
  private lastEmittedKey = '';
  private lastPath = '';

  async getProblem(): Promise<ProblemContext> {
    const [title, article, language, code] = await Promise.all([
      waitForElement<HTMLHeadingElement>(SELECTORS.title),
      waitForElement<HTMLElement>(SELECTORS.article),
      this.getLanguage(),
      this.getCode(),
    ]);

    return {
      platform: 'neetcode',
      title: normalizeText(title.textContent),
      description: parseDescription(article),
      constraints: parseConstraints(article),
      examples: parseExamples(article),
      language,
      code,
    };
  }

  async getCode(): Promise<string> {
    const editor = await waitForElement<HTMLTextAreaElement>(SELECTORS.editor);
    return readEditorValue(editor);
  }

  async getLanguage(): Promise<string> {
    const button = await waitForElement<HTMLButtonElement>(SELECTORS.language);
    return normalizeText(button.textContent);
  }

  observeCodeChanges(callback: (code: string) => void): () => void {
    let timeout: number | undefined;
    let lastCode = '';

    const schedule = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.matches(SELECTORS.editor)) return;

      window.clearTimeout(timeout);
      timeout = window.setTimeout(async () => {
        const code = await this.getCode();
        if (code === lastCode) return;

        lastCode = code;
        callback(code);
      }, 5_000);
    };

    document.addEventListener('input', schedule, true);
    document.addEventListener('keyup', schedule, true);
    document.addEventListener('paste', schedule, true);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('input', schedule, true);
      document.removeEventListener('keyup', schedule, true);
      document.removeEventListener('paste', schedule, true);
    };
  }

  observeContextChanges(
    callback: (problem: ProblemContext) => void,
  ): () => void {
    let timeout: number | undefined;
    let signature = '';

    const refresh = () => {
      if (timeout !== undefined) return;

      timeout = window.setTimeout(() => {
        timeout = undefined;
        const title = normalizeText(
          document.querySelector(SELECTORS.title)?.textContent,
        );
        const language = normalizeText(
          document.querySelector(SELECTORS.language)?.textContent,
        );
        const nextSignature = `${location.pathname}|${title}|${language}`;

        if (!title || !language || nextSignature === signature) return;

        signature = nextSignature;
        void this.getProblem()
          .then(callback)
          .catch(() => {
            signature = '';
          });
      }, 50);
    };

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', refresh);
    refresh();

    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener('popstate', refresh);
    };
  }

  observeRun(callback: ExecutionCallback): () => void {
    return this.observeExecution('run', callback);
  }

  observeSubmission(callback: ExecutionCallback): () => void {
    return this.observeExecution('submission', callback);
  }

  private observeExecution(
    kind: ExecutionKind,
    callback: ExecutionCallback,
  ): () => void {
    const listeners =
      kind === 'run' ? this.runListeners : this.submissionListeners;
    listeners.add(callback);
    this.ensureExecutionObserver();

    return () => {
      listeners.delete(callback);
      if (this.runListeners.size === 0 && this.submissionListeners.size === 0) {
        this.teardownExecutionObserver();
      }
    };
  }

  private ensureExecutionObserver() {
    if (this.executionObserver) return;

    const onClick = (event: MouseEvent) => {
      const kind = closestExecutionControl(event.target);
      if (!kind) return;
      this.markPendingUnlessDisabled(kind);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === "'") this.markPendingUnlessDisabled('run');
      if (event.key === 'Enter') {
        this.markPendingUnlessDisabled('submission');
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    this.stopExecutionListeners = () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };

    this.executionObserver = new MutationObserver(() => {
      if (location.pathname !== this.lastPath) {
        this.lastPath = location.pathname;
        this.pendingKind = undefined;
        this.lastEmittedKey = '';
      }
      this.detectBusyButtons();
      this.maybeEmitSettledResult();
    });
    this.executionObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.detectBusyButtons();
  }

  private teardownExecutionObserver() {
    this.stopExecutionListeners?.();
    this.stopExecutionListeners = undefined;
    this.executionObserver?.disconnect();
    this.executionObserver = undefined;
    this.pendingKind = undefined;
    this.lastEmittedKey = '';
  }

  private isControlDisabled(kind: ExecutionKind): boolean {
    const selector = kind === 'run' ? SELECTORS.run : SELECTORS.submit;
    const button = document.querySelector<HTMLButtonElement>(selector);
    return Boolean(button?.disabled);
  }

  private markPendingUnlessDisabled(kind: ExecutionKind) {
    if (this.isControlDisabled(kind)) return;
    this.markPending(kind);
  }

  private markPending(kind: ExecutionKind) {
    if (this.pendingKind === kind) return;
    this.pendingKind = kind;
    this.pendingStartedAt = Date.now();
    this.lastEmittedKey = '';
  }

  private detectBusyButtons() {
    if (isBusyLabel(buttonLabel(SELECTORS.run), 'run')) {
      this.markPending('run');
    }
    if (isBusyLabel(buttonLabel(SELECTORS.submit), 'submission')) {
      this.markPending('submission');
    }
  }

  private maybeEmitSettledResult() {
    if (!this.pendingKind) return;

    const runBusy = isBusyLabel(buttonLabel(SELECTORS.run), 'run');
    const submitBusy = isBusyLabel(buttonLabel(SELECTORS.submit), 'submission');
    if (runBusy || submitBusy) return;

    const description = readPlatformStatus();
    if (!description) return;

    const key = `${this.pendingKind}|${this.pendingStartedAt}|${description}`;
    if (key === this.lastEmittedKey) return;

    this.lastEmittedKey = key;
    const kind = this.pendingKind;
    this.pendingKind = undefined;

    const result = normalizeExecutionResult(description);
    const listeners =
      kind === 'run' ? this.runListeners : this.submissionListeners;
    for (const listener of listeners) listener(result);
  }
}

export const neetcodeAdapter = new BrowserNeetCodeAdapter();
