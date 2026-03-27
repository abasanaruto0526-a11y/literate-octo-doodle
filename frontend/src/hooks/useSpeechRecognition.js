import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function normalizeRecognizedText(value) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim();
}

function mergeRecognizedText(baseText, nextText) {
  const base = normalizeRecognizedText(baseText);
  const next = normalizeRecognizedText(nextText);

  if (!base) return next;
  if (!next) return base;
  if (base === next || base.endsWith(next)) return base;
  if (next.startsWith(base)) return next;

  const maxOverlap = Math.min(base.length, next.length);
  for (let size = maxOverlap; size >= 2; size -= 1) {
    if (base.slice(-size) === next.slice(0, size)) {
      return `${base}${next.slice(size)}`;
    }
  }

  return `${base} ${next}`.trim();
}

export function useSpeechRecognition() {
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [supported, setSupported] = useState(() => (isNativeAndroid ? true : Boolean(WebSpeechRecognition)));
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  const [audioStream, setAudioStream] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const nativeInterimRef = useRef('');
  const nativeTranscriptRef = useRef('');
  const nativeListenersRef = useRef([]);
  const nativeRestartTimerRef = useRef(null);

  const cleanupNativeListeners = useCallback(async () => {
    if (nativeRestartTimerRef.current) {
      clearTimeout(nativeRestartTimerRef.current);
      nativeRestartTimerRef.current = null;
    }

    nativeListenersRef.current.forEach((listener) => listener.remove().catch(() => {}));
    nativeListenersRef.current = [];
    await SpeechRecognition.removeAllListeners().catch(() => {});
  }, []);

  useEffect(() => {
    if (isNativeAndroid) {
      let cancelled = false;

      const setupNative = async () => {
        try {
          const { available } = await SpeechRecognition.available();
          if (!cancelled) {
            setSupported(available);
          }
        } catch (error) {
          console.error('SpeechRecognition availability check failed:', error);
          if (!cancelled) {
            setSupported(false);
          }
        }
      };

      setupNative();

      return () => {
        cancelled = true;
        shouldRestartRef.current = false;
        cleanupNativeListeners().catch(() => {});
      };
    }

    if (!WebSpeechRecognition) {
      return undefined;
    }

    const recognition = new WebSpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText);
      }

      setInterimTranscript(interimText);
    };

    recognition.onend = () => {
      setInterimTranscript('');

      if (shouldRestartRef.current) {
        try {
          recognition.start();
          return;
        } catch (error) {
          console.warn('SpeechRecognition restart failed:', error);
        }
      }

      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      shouldRestartRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, [cleanupNativeListeners, isNativeAndroid]);

  const stopMediaStream = useCallback(() => {
    if (!streamRef.current) return;

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setAudioStream(null);
  }, []);

  const startWebRecording = useCallback(async () => {
    if (streamRef.current || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    setAudioStream(stream);

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (audioChunksRef.current.length === 0) return;

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        setAudioBase64(reader.result);
      };
    };

    mediaRecorder.start();
  }, []);

  const startNativeSession = useCallback(async () => {
    await SpeechRecognition.start({
      language: 'ja-JP',
      maxResults: 1,
      partialResults: true,
      popup: false,
      prompt: '話してください',
    });
  }, []);

  const startNativeRecognition = useCallback(async () => {
    const permissionStatus = await SpeechRecognition.checkPermissions();
    if (permissionStatus.speechRecognition !== 'granted') {
      const requested = await SpeechRecognition.requestPermissions();
      if (requested.speechRecognition !== 'granted') {
        throw new Error('Microphone permission was denied');
      }
    }

    await cleanupNativeListeners();

    const partialListener = await SpeechRecognition.addListener('partialResults', ({ matches = [] }) => {
      const latest = Array.isArray(matches)
        ? matches.reduce((longest, current) => {
          const normalizedCurrent = normalizeRecognizedText(current);
          return normalizedCurrent.length > longest.length ? normalizedCurrent : longest;
        }, '')
        : '';

      if (!latest) {
        return;
      }

      nativeInterimRef.current = latest;
      nativeTranscriptRef.current = mergeRecognizedText(nativeTranscriptRef.current, latest);
      setTranscript(nativeTranscriptRef.current);
      setInterimTranscript('');
    });

    const listeningListener = await SpeechRecognition.addListener('listeningState', ({ status }) => {
      if (status === 'started') {
        setIsListening(true);
        return;
      }

      nativeInterimRef.current = '';

      setInterimTranscript('');

      if (!shouldRestartRef.current) {
        setIsListening(false);
        return;
      }

      nativeRestartTimerRef.current = setTimeout(() => {
        nativeRestartTimerRef.current = null;

        if (!shouldRestartRef.current) {
          setIsListening(false);
          return;
        }

        startNativeSession().catch((error) => {
          console.error('Failed to restart native speech recognition:', error);
          shouldRestartRef.current = false;
          setIsListening(false);
        });
      }, 200);
    });

    nativeListenersRef.current = [partialListener, listeningListener];
    nativeInterimRef.current = '';
    nativeTranscriptRef.current = '';
    shouldRestartRef.current = true;
    setIsListening(true);
    setInterimTranscript('');

    await startNativeSession();
  }, [cleanupNativeListeners, startNativeSession]);

  const startListening = useCallback(async () => {
    setTranscript('');
    setInterimTranscript('');
    setAudioUrl(null);
    setAudioBase64(null);
    nativeTranscriptRef.current = '';

    try {
      if (isNativeAndroid) {
        await startNativeRecognition();
        return;
      }

      if (!recognitionRef.current || isListening) return;

      await startWebRecording();
      shouldRestartRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      shouldRestartRef.current = false;
      stopMediaStream();
      console.error('Failed to start microphone:', error);
      setInterimTranscript('');
      setIsListening(false);
    }
  }, [isListening, isNativeAndroid, startNativeRecognition, startWebRecording, stopMediaStream]);

  const stopListening = useCallback(async () => {
    if (isNativeAndroid) {
      shouldRestartRef.current = false;
      setIsListening(false);
      setInterimTranscript('');

      if (nativeRestartTimerRef.current) {
        clearTimeout(nativeRestartTimerRef.current);
        nativeRestartTimerRef.current = null;
      }

      const pendingInterim = nativeInterimRef.current;
      nativeInterimRef.current = '';

      try {
        await Promise.race([
          SpeechRecognition.stop(),
          new Promise((resolve) => {
            setTimeout(resolve, 800);
          }),
        ]);
      } catch (error) {
        console.error('Failed to stop native speech recognition:', error);
      }

      if (pendingInterim) {
        nativeTranscriptRef.current = mergeRecognizedText(nativeTranscriptRef.current, pendingInterim);
        setTranscript(nativeTranscriptRef.current);
      }

      await cleanupNativeListeners();
      return;
    }

    if (!recognitionRef.current) return;

    shouldRestartRef.current = false;
    recognitionRef.current.stop();
    setIsListening(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopMediaStream();
  }, [cleanupNativeListeners, isNativeAndroid, stopMediaStream]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setAudioUrl(null);
    setAudioBase64(null);
    nativeInterimRef.current = '';
    nativeTranscriptRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    supported,
    startListening,
    stopListening,
    resetTranscript,
    audioUrl,
    audioBase64,
    audioStream,
  };
}
