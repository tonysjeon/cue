import type { ProblemContext } from '@cue/shared';

const SELECTORS = {
  title: 'h1.problem-title',
  article: 'main.neeter-article-content',
  language: 'button.editor-language-btn',
  editor: 'textarea[aria-label="Code editor"]',
} as const;

const normalizeText = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim() ?? '';

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

export interface NeetCodeAdapter {
  getProblem(): Promise<ProblemContext>;
  getCode(): Promise<string>;
  getLanguage(): Promise<string>;
  observeCodeChanges(callback: (code: string) => void): () => void;
}

class BrowserNeetCodeAdapter implements NeetCodeAdapter {
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
}

export const neetcodeAdapter = new BrowserNeetCodeAdapter();
