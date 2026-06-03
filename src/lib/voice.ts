type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEvent = Event & {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function createSpeechRecognition(
  onTranscript: (text: string) => void,
  onEnd: () => void
) {
  const Recognition = getSpeechRecognitionConstructor();

  if (!Recognition) {
    return {
      supported: false,
      start: () => undefined,
      stop: () => undefined,
    };
  }

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0]?.transcript ?? "";
    }
    onTranscript(transcript.trim());
  };
  recognition.onend = onEnd;

  return {
    supported: true,
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}

export function speak(text: string, onEnd?: () => void) {
  if (!isSpeakingSupported()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => {
    const name = voice.name.toLowerCase();
    return (
      voice.lang.toLowerCase().startsWith("en") &&
      (name.includes("female") ||
        name.includes("samantha") ||
        name.includes("google uk english female"))
    );
  });

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onend = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isSpeakingSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeakingSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
