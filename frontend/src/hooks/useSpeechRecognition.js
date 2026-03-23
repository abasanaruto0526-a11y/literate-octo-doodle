import { useState, useEffect, useRef, useCallback } from 'react';

// ブラウザの音声認識APIを取得
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText) {
        setTranscript(prev => prev + finalText);
      }
      setInterimTranscript(interimText);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onerror = (e) => {
      console.error('音声認識エラー:', e.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => recognition.abort();
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setInterimTranscript('');
    setAudioUrl(null);
    setAudioBase64(null);
    
    // Start speech recognition
    recognitionRef.current.start();
    setIsListening(true);
    
    // Start actual audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
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
    } catch (e) {
      console.error('マイクへのアクセスに失敗しました', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setAudioUrl(null);
    setAudioBase64(null);
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
    audioBase64
  };
}
