type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

function SpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return (
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  );
}

export function listenForSpeech(
  onFinalTranscript: (transcript: string) => void,
): () => void {
  const Recognition = SpeechRecognitionConstructor();
  if (!Recognition) {
    throw new Error('Speech recognition is not available in this browser');
  }

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  let active = true;

  recognition.onresult = (event) => {
    for (
      let index = event.resultIndex;
      index < event.results.length;
      index += 1
    ) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript && result.isFinal) {
        onFinalTranscript(transcript);
      }
    }
  };

  recognition.onend = () => {
    if (active) recognition.start();
  };

  recognition.start();

  return () => {
    active = false;
    recognition.onend = null;
    recognition.abort();
  };
}
