const API_URL = 'http://localhost:8000';

type ApiMessage = {
  type: 'cue-api';
  method: string;
  path: string;
  body?: unknown;
};

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ApiMessage, _sender, sendResponse) => {
      if (message.type !== 'cue-api') return false;

      void (async () => {
        try {
          const response = await fetch(`${API_URL}${message.path}`, {
            method: message.method,
            headers: { 'Content-Type': 'application/json' },
            body:
              message.body == null ? undefined : JSON.stringify(message.body),
          });
          const data = await response.json().catch(() => undefined);
          sendResponse({
            ok: response.ok,
            status: response.status,
            data,
          });
        } catch (error) {
          sendResponse({
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : 'Request failed',
          });
        }
      })();

      return true;
    },
  );
});
