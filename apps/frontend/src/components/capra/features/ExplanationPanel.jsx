import { useState, useEffect, useRef, useCallback } from 'react';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';


// Format text with basic markdown-like styling
function FormattedText({ text }) {
  if (!text) return null;

  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        if (para.trim().startsWith('```') || para.match(/^[\s]{4,}/m)) {
          const code = para.replace(/^```\w*\n?|```$/g, '').trim();
          return (
            <pre key={i} className="p-3 rounded-lg text-xs font-mono overflow-x-auto bg-gray-50 text-brand-400 border border-gray-200">
              {code}
            </pre>
          );
        }

        if (para.match(/^[\s]*[-•*]\s/m)) {
          const items = para.split(/\n/).filter(line => line.trim());
          return (
            <ul key={i} className="space-y-1.5 ml-4 list-disc text-gray-900 marker:text-brand-400">
              {items.map((item, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  {item.replace(/^[\s]*[-•*]\s*/, '')}
                </li>
              ))}
            </ul>
          );
        }

        if (para.match(/^[\s]*\d+[.)]\s/m)) {
          const items = para.split(/\n/).filter(line => line.trim());
          return (
            <ol key={i} className="space-y-1.5 ml-4 list-decimal text-gray-900 marker:text-brand-400">
              {items.map((item, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  {item.replace(/^[\s]*\d+[.)]\s*/, '')}
                </li>
              ))}
            </ol>
          );
        }

        const escaped = para
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const formatted = escaped
          .split(/\n/)
          .join(' ')
          .replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong class="font-semibold text-gray-900">$1$2</strong>')
          .replace(/`([^`]+)`/g, '<code class="bg-brand-400/10 text-brand-400 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
          .replace(/\*(.+?)\*|_(.+?)_/g, '<em class="text-gray-900">$1$2</em>');

        return (
          <p
            key={i}
            className="text-sm leading-relaxed text-gray-900"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      })}
    </div>
  );
}

export default function ExplanationPanel({ explanations, highlightedLine, pitch, systemDesign, isStreaming, onExpandSystemDesign, canExpandSystemDesign, onFollowUpQuestion, isProcessingFollowUp }) {
  const hasSystemDesign = systemDesign && systemDesign.included;
  const hasSolution = pitch || (explanations && explanations.length > 0) || hasSystemDesign;

  // Q&A state
  const [autoListenEnabled, setAutoListenEnabled] = useState(false);
  const [listeningState, setListeningState] = useState('idle'); // 'idle' | 'listening' | 'recording' | 'transcribing' | 'answering'
  const [qaHistory, setQaHistory] = useState([]);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio device selection
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  // Audio refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceStartRef = useRef(null);
  const speechDetectedRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  // Load available audio devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
          s.getTracks().forEach(t => t.stop());
        }).catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(audioInputs);

        // Try to find a good default device (virtual audio device or external)
        const virtualDevice = audioInputs.find(d =>
          d.label.toLowerCase().includes('blackhole') ||
          d.label.toLowerCase().includes('loopback') ||
          d.label.toLowerCase().includes('soundflower') ||
          d.label.toLowerCase().includes('aggregate')
        );
        const externalDevice = audioInputs.find(d =>
          d.label.toLowerCase().includes('jabra') ||
          d.label.toLowerCase().includes('usb') ||
          d.label.toLowerCase().includes('external')
        );

        if (virtualDevice) {
          setSelectedDeviceId(virtualDevice.deviceId);
        } else if (externalDevice) {
          setSelectedDeviceId(externalDevice.deviceId);
        } else if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (e) {
        console.error('[Q&A] Failed to enumerate devices:', e);
      }
    };
    loadDevices();
  }, []);

  const stopEverything = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    setListeningState('idle');
    setAudioLevel(0);
  }, []);

  const transcribeAudio = async (audioBlob) => {
    if (!audioBlob || audioBlob.size < 1000) {
      console.log('[Q&A] Audio too small, skipping');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(API_URL + '/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Transcription failed');
      }

      const data = await response.json();
      return data.text?.trim() || null;
    } catch (err) {
      console.error('[Q&A] Transcription error:', err);
      setError(err.message);
      return null;
    }
  };

  const handleSubmitQuestion = async (question) => {
    const q = question?.trim();
    if (!q || !onFollowUpQuestion) return false;

    // Filter out Whisper hallucinations
    const hallucinations = [
      'bye', 'bye-bye', 'bye bye', 'goodbye', 'thank you', 'thanks',
      'thanks for watching', 'see you', 'you', 'the', 'a', 'i', 'it',
      'um', 'uh', 'hmm', 'ah', 'oh', 'okay', 'ok', 'so', 'yeah', 'yes', 'no',
      'silence', 'music', 'applause', 'laughter'
    ];
    const cleanQ = q.toLowerCase().replace(/[.,!?]/g, '').trim();
    const isHallucination = q.length < 8 || hallucinations.includes(cleanQ);

    if (isHallucination) {
      console.log('[Q&A] Filtered hallucination:', q);
      return false;
    }

    isProcessingRef.current = true;
    setListeningState('answering');

    // Add to history with pending state
    setQaHistory(prev => [...prev, { question: q, answer: null, pending: true }]);

    try {
      console.log('[Q&A] Submitting question:', q);
      const result = await onFollowUpQuestion(q);
      console.log('[Q&A] Got result:', result);

      setQaHistory(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            question: q,
            answer: result?.answer || 'No answer received',
            pending: false
          };
        }
        return updated;
      });
      return true;
    } catch (err) {
      console.error('[Q&A] Submit error:', err);
      setQaHistory(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            question: q,
            answer: 'Error: ' + err.message,
            pending: false
          };
        }
        return updated;
      });
      return false;
    } finally {
      isProcessingRef.current = false;
    }
  };

  const startSystemAudioCapture = async () => {
    if (isProcessingRef.current) return;

    setError(null);
    audioChunksRef.current = [];
    speechDetectedRef.current = false;
    silenceStartRef.current = null;

    try {
      let stream;

      // Use selected audio device (could be virtual device like BlackHole for system audio)
      const deviceConstraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };

      const selectedDevice = audioDevices.find(d => d.deviceId === selectedDeviceId);
      console.log('[Q&A] Using audio device:', selectedDevice?.label || 'default');

      stream = await navigator.mediaDevices.getUserMedia(deviceConstraints);

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      // Find supported mime type
      let mimeType = 'audio/webm';
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (speechDetectedRef.current && audioChunksRef.current.length > 0) {
          setListeningState('transcribing');
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const text = await transcribeAudio(audioBlob);

          if (text) {
            const submitted = await handleSubmitQuestion(text);
            if (!submitted) {
              // Hallucination filtered, restart listening
              if (autoListenEnabled && !isProcessingRef.current) {
                setTimeout(() => startSystemAudioCapture(), 300);
              }
            } else {
              // Question answered, restart listening
              if (autoListenEnabled && !isProcessingRef.current) {
                setTimeout(() => startSystemAudioCapture(), 500);
              }
            }
          } else {
            // No transcription, restart listening
            if (autoListenEnabled && !isProcessingRef.current) {
              setTimeout(() => startSystemAudioCapture(), 300);
            }
          }
        } else {
          // No speech detected, restart listening
          if (autoListenEnabled && !isProcessingRef.current) {
            setTimeout(() => startSystemAudioCapture(), 300);
          }
        }
        audioChunksRef.current = [];
        speechDetectedRef.current = false;
      };

      // Start in listening mode
      setListeningState('listening');

      // Voice Activity Detection loop
      const SPEECH_THRESHOLD = 20;
      const SILENCE_DURATION = 1500; // 1.5 seconds of silence to stop

      const detectVoice = () => {
        if (!analyserRef.current || !autoListenEnabled) {
          return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        setAudioLevel(Math.min(100, average * 3));

        const isSpeaking = average > SPEECH_THRESHOLD;

        if (isSpeaking) {
          if (!speechDetectedRef.current) {
            // Start recording
            speechDetectedRef.current = true;
            audioChunksRef.current = [];
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              mediaRecorderRef.current.start(100);
            }
            setListeningState('recording');
          }
          silenceStartRef.current = null;
        } else if (speechDetectedRef.current) {
          // Silence after speech
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
            // Enough silence, stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(detectVoice);
      };

      detectVoice();

    } catch (err) {
      console.error('[Q&A] Audio capture error:', err);
      setError('Audio capture failed: ' + err.message);
      setListeningState('idle');
    }
  };

  const toggleAutoListen = () => {
    if (autoListenEnabled) {
      setAutoListenEnabled(false);
      stopEverything();
    } else {
      setAutoListenEnabled(true);
      startSystemAudioCapture();
    }
  };

  const getStatusText = () => {
    switch (listeningState) {
      case 'listening': return 'Waiting for interviewer...';
      case 'recording': return 'Recording question...';
      case 'transcribing': return 'Transcribing...';
      case 'answering': return 'Generating answer...';
      default: return 'Click to start';
    }
  };

  const getStatusColor = () => {
    switch (listeningState) {
      case 'listening': return 'bg-success-500';
      case 'recording': return 'bg-error-500 animate-pulse';
      case 'transcribing': return 'bg-warning-500';
      case 'answering': return 'bg-info-500';
      default: return 'bg-gray-300';
    }
  };

  // Empty state
  if ((!explanations || explanations.length === 0) && !pitch && !hasSystemDesign && !isStreaming) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Explanation</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No explanation yet</p>
            <p className="text-xs text-gray-400">Paste a problem and hit Solve to see a step-by-step breakdown</p>
          </div>
        </div>
      </div>
    );
  }

  // Streaming state
  if (isStreaming && !pitch && (!explanations || explanations.length === 0)) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-sm font-semibold text-gray-900">Explanation</span>
            <div className="flex gap-0.5 ml-1.5">
              <span className="w-1 h-1 rounded-full animate-bounce bg-brand-400" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce bg-brand-400" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full animate-bounce bg-brand-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Generating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-400" />
          <span className="text-sm font-semibold text-gray-900">Explanation</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {/* Solution Pitch - Structured format for easy verbal delivery */}
        {pitch && (
          <div className="p-4 rounded-lg bg-brand-400/10 border border-brand-400/30 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-brand-400/20">
                <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-brand-400">
                How to Explain
              </span>
            </div>

            {/* Handle structured pitch object */}
            {typeof pitch === 'object' && pitch.opener ? (
              <div className="space-y-3">
                {/* Opener - the hook */}
                <div>
                  <span className="text-xs font-semibold text-gray-600 uppercase">Start with</span>
                  <p className="text-sm text-gray-900 font-medium mt-0.5 italic">"{pitch.opener}"</p>
                </div>

                {/* Approach */}
                {pitch.approach && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase">Then explain</span>
                    <p className="text-sm text-gray-900 mt-0.5">{pitch.approach}</p>
                  </div>
                )}

                {/* Key Points */}
                {pitch.keyPoints && pitch.keyPoints.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase">Key Points to Mention</span>
                    <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-1">
                      {pitch.keyPoints.map((point, i) => (
                        <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                          <span className="text-brand-400 font-bold">{i + 1}.</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Complexity */}
                {pitch.complexity && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase">Complexity</span>
                    <p className="text-xs text-gray-900 mt-0.5 font-mono bg-gray-100/50 px-2 py-1 rounded-lg inline-block">{pitch.complexity}</p>
                  </div>
                )}

                {/* Tradeoffs */}
                {pitch.tradeoffs && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase">Tradeoffs</span>
                    {Array.isArray(pitch.tradeoffs) ? (
                      <ul className="mt-1 space-y-1">
                        {pitch.tradeoffs.map((tradeoff, i) => (
                          <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                            <span className="text-warning-400 mt-0.5">⚖</span>
                            <span>{tradeoff}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-900 mt-0.5">{pitch.tradeoffs}</p>
                    )}
                  </div>
                )}

                {/* Edge Cases */}
                {pitch.edgeCases && pitch.edgeCases.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase">Edge Cases to Mention</span>
                    <ul className="mt-1 space-y-1">
                      {pitch.edgeCases.map((edge, i) => (
                        <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                          <span className="text-error-400 mt-0.5">⚠</span>
                          <span>{edge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : typeof pitch === 'object' ? (
              /* Object without opener - render available fields nicely */
              <div className="space-y-3">
                {Object.entries(pitch).map(([key, value]) => {
                  if (!value) return null;
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  return (
                    <div key={key}>
                      <span className="text-xs font-semibold text-gray-600 uppercase">{label}</span>
                      {Array.isArray(value) ? (
                        <ul className="mt-1 space-y-1">
                          {value.map((item, i) => (
                            <li key={i} className="text-xs text-gray-900 flex items-start gap-2">
                              <span className="text-brand-400 font-bold">{i + 1}.</span>
                              {typeof item === 'string' ? item : JSON.stringify(item)}
                            </li>
                          ))}
                        </ul>
                      ) : typeof value === 'object' ? (
                        <p className="text-sm text-gray-900 mt-0.5">{JSON.stringify(value)}</p>
                      ) : (
                        <p className="text-sm text-gray-900 mt-0.5">{value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Fallback for string format */
              <FormattedText text={typeof pitch === 'string' ? pitch : String(pitch)} />
            )}
          </div>
        )}

        {/* Interviewer Q&A Section */}
        {hasSolution && onFollowUpQuestion && (
          <div className="p-4 rounded-lg bg-gray-100/30 border border-gray-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-info-400/20">
                  <svg className="w-4 h-4 text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-900">
                  Interviewer Q&A
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Clear Q&A Button */}
                {qaHistory.length > 0 && (
                  <button
                    onClick={() => setQaHistory([])}
                    className="p-2 text-gray-600 hover:text-error-400 hover:bg-error-900/20 rounded-lg transition-all duration-200"
                    title="Clear Q&A history"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {/* Device Selector */}
                <button
                  onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                  className="p-2 text-gray-600 hover:text-info-400 hover:bg-info-900/20 rounded-lg transition-all duration-200"
                  title="Select audio input device"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Auto-Listen Toggle */}
                <button
                  onClick={toggleAutoListen}
                  disabled={isProcessingFollowUp}
                  className={`
                    px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2
                    ${autoListenEnabled
                      ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-gray-900 shadow-lg shadow-brand-400/25 hover:shadow-brand-400/40'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {autoListenEnabled && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                  )}
                  {autoListenEnabled ? 'Stop' : 'Auto-Listen'}
                </button>
              </div>
            </div>

            {/* Device Selector Dropdown */}
            {showDeviceSelector && (
              <div className="mb-3 p-3 rounded-lg bg-gray-100/30 border border-gray-200">
                <label className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                  Audio Input Device
                </label>
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-transparent transition-all"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Device ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  <strong>Tip:</strong> For best results capturing interviewer voice from Zoom/Meet/Teams:
                  <br />• Install <a href="https://existential.audio/blackhole/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">BlackHole</a> (free virtual audio device)
                  <br />• Create Multi-Output Device in Audio MIDI Setup
                  <br />• Route system audio through BlackHole
                  <br />• Select BlackHole here as input
                </p>
              </div>
            )}

            {/* Status/Error */}
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-error-900/20 border border-error-700/50 text-error-400 text-sm">
                {error}
              </div>
            )}

            {/* Live status */}
            {autoListenEnabled && (
              <div className="mb-3 p-3 rounded-lg bg-info-900/20 border-2 border-info-700/50">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                  <span className="text-sm text-gray-900 font-medium flex-1">
                    {getStatusText()}
                  </span>
                  {/* Audio level indicator */}
                  {(listeningState === 'listening' || listeningState === 'recording') && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            audioLevel > i * 20 ? 'bg-brand-400' : 'bg-gray-200'
                          }`}
                          style={{ height: `${8 + i * 3}px` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {audioDevices.find(d => d.deviceId === selectedDeviceId)?.label?.toLowerCase().includes('blackhole')
                    ? 'Capturing system audio via BlackHole'
                    : 'Using: ' + (audioDevices.find(d => d.deviceId === selectedDeviceId)?.label || 'default mic')}
                </p>
              </div>
            )}

            {/* Q&A History - newest first */}
            {qaHistory.length > 0 && (
              <div className="space-y-3">
                {[...qaHistory].reverse().map((qa, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-100/30 border border-gray-200 animate-fadeIn">
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold bg-info-900/30 text-info-400">Q</span>
                        <span className="text-xs font-semibold uppercase text-info-400">Question</span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium pl-6">{qa.question}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold bg-brand-900/30 text-brand-400">A</span>
                        <span className="text-xs font-semibold uppercase text-brand-400">Answer</span>
                      </div>
                      {qa.pending ? (
                        <div className="pl-6 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 rounded-full animate-spin border-brand-400 border-t-transparent" />
                          <p className="text-sm text-gray-500 italic">Generating answer...</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 whitespace-pre-wrap pl-6">{qa.answer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Line-by-line Explanations */}
        {explanations && explanations.length > 0 && (
          <div className="p-4 rounded-lg bg-gray-100/30 border border-gray-200 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-200/50">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                Line Breakdown
              </span>
            </div>
            <div className="space-y-2">
              {explanations.map((item, index) => {
                const isHighlighted = highlightedLine === item.line;
                return (
                  <div
                    key={index}
                    className={`px-2 py-2 rounded-lg transition-all duration-200 ${
                      isHighlighted ? 'bg-brand-400/10 border border-brand-400/30' : 'hover:bg-gray-100/30'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-xs font-mono font-bold ${
                          isHighlighted ? 'bg-brand-400 text-gray-900' : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {item.line}
                      </span>
                      <code className="flex-1 text-sm font-mono text-gray-900 font-medium select-text cursor-text whitespace-pre-wrap break-words">
                        {item.code}
                      </code>
                    </div>
                    <div className="pl-8">
                      <p className="text-sm text-gray-900 select-text leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
