import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
import { getAuthHeaders } from '../../../utils/authHeaders.js';


// COMPACT markdown renderer - tables side-by-side, minimal spacing
function renderMarkdown(text) {
  if (!text) return null;

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const processInline = (str) => {
    str = escapeHtml(str);
    str = str.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #f1f5f9; font-weight: 600;">$1</strong>');
    str = str.replace(/__(.+?)__/g, '<strong style="color: #f1f5f9; font-weight: 600;">$1</strong>');
    str = str.replace(/\*(.+?)\*/g, '<em>$1</em>');
    str = str.replace(/_(.+?)_/g, '<em>$1</em>');
    str = str.replace(/`([^`]+)`/g, '<code style="padding: 0 3px; background: rgba(16, 185, 129, 0.15); border-radius: 2px; color: #10b981; font-family: monospace; font-size: 10px;">$1</code>');
    return str;
  };

  const parseTable = (tableLines) => {
    if (tableLines.length < 2) return null;
    const parseRow = (line) => line.split('|').map(cell => cell.trim()).filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr.length === 1));
    const headers = parseRow(tableLines[0]);
    const rows = tableLines.slice(2).map(parseRow);
    return { headers, rows };
  };

  let processedText = text;

  // Extract :::card[Title] ... ::: blocks
  const cards = [];
  processedText = processedText.replace(/:::card\[([^\]]+)\]\n([\s\S]*?):::/g, (match, title, content) => {
    cards.push({ title, content: content.trim() });
    return `__CARD_${cards.length - 1}__`;
  });

  // Extract :::ascii ... ::: blocks
  const asciiBlocks = [];
  processedText = processedText.replace(/:::ascii\n([\s\S]*?):::/g, (match, content) => {
    asciiBlocks.push(content.trim());
    return `__ASCII_${asciiBlocks.length - 1}__`;
  });

  // Extract code blocks
  const codeBlocks = [];
  processedText = processedText.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    codeBlocks.push({ language: lang || 'code', content: code.trim() });
    return `__CODE_${codeBlocks.length - 1}__`;
  });

  // Extract tables
  const tables = [];
  processedText = processedText.replace(/(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+)/g, (match) => {
    tables.push(match.trim());
    return `__TABLE_${tables.length - 1}__`;
  });

  const elements = [];
  let elementKey = 0;
  const lines = processedText.split('\n');

  // Collect consecutive tables for grid layout
  let pendingTables = [];

  const flushTables = () => {
    if (pendingTables.length === 0) return;
    if (pendingTables.length === 1) {
      elements.push(pendingTables[0]);
    } else {
      // Multiple tables - render in grid
      elements.push(
        <div key={elementKey++} className="grid grid-cols-2 gap-2 my-1">
          {pendingTables}
        </div>
      );
    }
    pendingTables = [];
  };

  const renderTable = (tableIdx) => {
    const tableText = tables[tableIdx];
    if (!tableText) return null;
    const tableLines = tableText.split('\n');
    const table = parseTable(tableLines);
    if (!table) return null;

    return (
      <div key={elementKey++} className="rounded-lg overflow-hidden border border-[var(--border)]/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--bg-elevated)]/60">
              {table.headers.map((header, i) => (
                <th key={i} className="px-2 py-1 text-left font-bold text-brand-400 border-b border-[var(--border)]/40 uppercase text-xs">
                  <span dangerouslySetInnerHTML={{ __html: processInline(header) }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-[var(--bg-elevated)]/30' : 'bg-[var(--bg-elevated)]'}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-2 py-0.5 text-[var(--text-primary)] border-b border-[var(--border)]/20">
                    <span dangerouslySetInnerHTML={{ __html: processInline(cell) }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { flushTables(); return; }

    // Card - compact single line style
    const cardMatch = trimmed.match(/^__CARD_(\d+)__$/);
    if (cardMatch) {
      flushTables();
      const card = cards[parseInt(cardMatch[1])];
      elements.push(
        <div key={elementKey++} className="mb-2 px-3 py-2 rounded-lg bg-gradient-to-r from-brand-500/20 to-brand-400/5 border border-brand-400/40">
          <div className="flex items-center gap-2">
            <span className="text-brand-400 text-xs">💬</span>
            <span className="text-xs font-semibold text-brand-400 uppercase">{card.title}</span>
          </div>
          <p className="text-xs text-[var(--text-primary)] mt-1 leading-snug" dangerouslySetInnerHTML={{ __html: processInline(card.content.replace(/\n/g, ' ')) }} />
        </div>
      );
      return;
    }

    // ASCII diagram - compact
    const asciiMatch = trimmed.match(/^__ASCII_(\d+)__$/);
    if (asciiMatch) {
      flushTables();
      const ascii = asciiBlocks[parseInt(asciiMatch[1])];
      if (ascii) {
        elements.push(
          <div key={elementKey++} className="my-1 rounded-lg overflow-hidden border border-brand-400/30">
            <pre className="p-2 bg-[var(--bg-elevated)]/80 overflow-x-auto">
              <code className="text-xs leading-tight text-brand-300 font-mono whitespace-pre">{ascii}</code>
            </pre>
          </div>
        );
      }
      return;
    }

    // Code block
    const codeMatch = trimmed.match(/^__CODE_(\d+)__$/);
    if (codeMatch) {
      flushTables();
      const block = codeBlocks[parseInt(codeMatch[1])];
      if (block) {
        elements.push(
          <div key={elementKey++} className="my-1 rounded-lg overflow-hidden border border-[var(--border)]/40">
            <pre className="p-2 bg-[var(--bg-elevated)]/80 overflow-x-auto">
              <code className="text-xs text-[var(--text-primary)] font-mono whitespace-pre">{block.content}</code>
            </pre>
          </div>
        );
      }
      return;
    }

    // Table - collect for grid layout
    const tableMatch = trimmed.match(/^__TABLE_(\d+)__$/);
    if (tableMatch) {
      const tableEl = renderTable(parseInt(tableMatch[1]));
      if (tableEl) pendingTables.push(tableEl);
      return;
    }

    // Non-table content - flush pending tables first
    flushTables();

    // Bullet list - inline
    if (trimmed.match(/^[-*•]\s+/)) {
      elements.push(
        <span key={elementKey++} className="inline-flex items-center gap-1 text-xs text-[var(--text-primary)] mr-2">
          <span className="text-brand-400">•</span>
          <span dangerouslySetInnerHTML={{ __html: processInline(trimmed.replace(/^[-*•]\s+/, '')) }} />
        </span>
      );
      return;
    }

    // Headers - minimal
    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={elementKey++} className="text-xs font-bold mt-2 mb-0.5 text-brand-400">{trimmed.slice(4)}</h4>);
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={elementKey++} className="text-xs font-bold mt-2 mb-0.5 text-brand-300">{trimmed.slice(3)}</h3>);
      return;
    }

    // Regular text
    elements.push(<p key={elementKey++} className="text-xs text-[var(--text-primary)] mb-0.5" dangerouslySetInnerHTML={{ __html: processInline(trimmed) }} />);
  });

  flushTables();
  return elements;
}


// getAuthHeaders is now imported from utils/authHeaders.js

export default function AscendAssistantPanel({ onClose, provider, model, isDedicatedWindow = false, context = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [answer, setAnswer] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false); // Sync ref to prevent race conditions
  const [error, setError] = useState(null);
  const [showBlackholeSetup, setShowBlackholeSetup] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Device selection
  const [audioDevices, setAudioDevices] = useState({ inputs: [], outputs: [] });
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [audioSource, setAudioSource] = useState('mic'); // 'mic' or 'system' - default to mic (more reliable)

  const speakerStreamRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentMimeTypeRef = useRef('audio/webm');

  // Voice Activity Detection (VAD)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  const speechStartTimeRef = useRef(null);
  const silenceStartTimeRef = useRef(null);
  const allChunksRef = useRef([]); // ALL chunks for complete audio file
  const lastTranscriptionRef = useRef(''); // Track last transcription to avoid duplicates
  const autoAnswerTimeoutRef = useRef(null); // Debounce auto-answer generation
  const lastAnsweredTextRef = useRef(''); // Track what we've already answered
  const pendingQuestionsRef = useRef([]); // Queue for questions while generating (FIFO)
  const lastTranscribedSizeRef = useRef(0); // Track how much audio we've transcribed
  const lastTranscribedChunkIndexRef = useRef(0); // Track which chunk index we've transcribed up to
  const headerChunksRef = useRef([]); // Store the first few chunks that contain file headers
  const VAD_THRESHOLD = 0.12; // Higher threshold - only captures close-up speech (~3 feet radius)
  const SILENCE_DURATION = 1500; // 1.5s silence to end segment
  const MIN_SPEECH_DURATION = 800; // 0.8s minimum speech
  const TRANSCRIPTION_COOLDOWN = 4000; // 4s between transcriptions to avoid rate limits
  const periodicTranscribeRef = useRef(null); // Periodic transcription timer
  const lastTranscriptionTimeRef = useRef(0); // Track when we last transcribed
  const askedQuestionsRef = useRef(new Set()); // Track all asked questions to prevent duplicates

  // Store questions as array for separate lines
  const [questions, setQuestions] = useState([]);

  // Live transcript - shows everything being captured
  const [liveTranscript, setLiveTranscript] = useState('');
  const fullTranscriptRef = useRef(''); // Accumulate full transcript
  const PERIODIC_TRANSCRIBE_INTERVAL = 6000; // Transcribe every 6 seconds to avoid rate limits

  // Conversation history - persisted to localStorage
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Context documents for better answers
  const [expandedContext, setExpandedContext] = useState(null); // 'jd', 'resume', 'prep', or null
  const [jobDescription, setJobDescription] = useState(() => localStorage.getItem('voice_jd') || '');
  const [resume, setResume] = useState(() => localStorage.getItem('voice_resume') || '');
  const [prepMaterial, setPrepMaterial] = useState(() => localStorage.getItem('voice_prep') || '');
  const [uploadingFile, setUploadingFile] = useState(null);

  // Transcription provider: 'openai' (Whisper) or 'deepgram' (Nova-2)
  const [transcriptionProvider, setTranscriptionProvider] = useState(() =>
    localStorage.getItem('voice_transcription_provider') || 'openai'
  );

  // File refs for upload
  const jdFileRef = useRef(null);
  const resumeFileRef = useRef(null);
  const prepFileRef = useRef(null);

  // Save context and settings to localStorage
  useEffect(() => {
    localStorage.setItem('voice_jd', jobDescription);
  }, [jobDescription]);
  useEffect(() => {
    localStorage.setItem('voice_transcription_provider', transcriptionProvider);
  }, [transcriptionProvider]);
  useEffect(() => {
    localStorage.setItem('voice_resume', resume);
  }, [resume]);
  useEffect(() => {
    localStorage.setItem('voice_prep', prepMaterial);
  }, [prepMaterial]);

  // Handle file upload and text extraction
  const handleFileUpload = async (file, setter, type) => {
    if (!file) return;

    setUploadingFile(type);
    try {
      const fileName = file.name.toLowerCase();
      let text = '';

      if (fileName.endsWith('.txt')) {
        text = await file.text();
      } else if (fileName.endsWith('.pdf')) {
        // Use backend to extract PDF text
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/api/ascend/extract-text`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          text = data.text || '';
        } else {
          // Fallback: just note the file was uploaded
          text = `[PDF uploaded: ${file.name}]`;
        }
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        // Use backend to extract DOCX text
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/api/ascend/extract-text`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          text = data.text || '';
        } else {
          text = `[Document uploaded: ${file.name}]`;
        }
      } else {
        // Try to read as text
        text = await file.text();
      }

      setter(prev => prev ? prev + '\n\n' + text : text);
    } catch (err) {
      console.error('File upload error:', err);
      setter(prev => prev ? prev + `\n\n[Error reading ${file.name}]` : `[Error reading ${file.name}]`);
    } finally {
      setUploadingFile(null);
    }
  };

  // Load conversation history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ascend_assistant_history');
    if (saved) {
      try {
        setConversationHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load conversation history:', e);
      }
    }
  }, []);


  // Save conversation history to localStorage
  const saveToHistory = useCallback((question, answerText) => {
    const entry = {
      id: Date.now(),
      question: question.trim(),
      answer: answerText.trim(),
      timestamp: new Date().toISOString()
    };
    setConversationHistory(prev => {
      const updated = [...prev, entry];
      localStorage.setItem('ascend_assistant_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    if (confirm('Clear all conversation history?')) {
      setConversationHistory([]);
      localStorage.removeItem('ascend_assistant_history');
    }
  }, []);

  // Load available audio devices and persist selection
  useEffect(() => {
    async function loadDevices() {
      try {
        // Try to request permission first to get device labels
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr) {
          console.warn('Initial audio permission request failed:', permErr.message);
          // Continue anyway - we'll handle permission errors when recording starts
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        const outputs = devices.filter(d => d.kind === 'audiooutput');

        setAudioDevices({ inputs, outputs });

        // Load saved preferences or use defaults
        const savedMic = localStorage.getItem('interview_mic');
        const savedSpeaker = localStorage.getItem('interview_speaker');

        if (savedMic && inputs.find(d => d.deviceId === savedMic)) {
          setSelectedMic(savedMic);
        } else if (inputs.length > 0) {
          setSelectedMic(inputs[0].deviceId);
        }

        if (savedSpeaker && outputs.find(d => d.deviceId === savedSpeaker)) {
          setSelectedSpeaker(savedSpeaker);
        } else if (outputs.length > 0) {
          setSelectedSpeaker(outputs[0].deviceId);
        }

        // Show warning if no inputs found
        if (inputs.length === 0) {
          setError('No microphone detected. Please connect a microphone.');
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err);
        setError('Could not detect audio devices. Please check permissions.');
      }
    }

    loadDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  // Save device preferences when changed
  useEffect(() => {
    if (selectedMic) localStorage.setItem('interview_mic', selectedMic);
  }, [selectedMic]);

  useEffect(() => {
    if (selectedSpeaker) localStorage.setItem('interview_speaker', selectedSpeaker);
  }, [selectedSpeaker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (autoAnswerTimeoutRef.current) {
        clearTimeout(autoAnswerTimeoutRef.current);
      }
    };
  }, []);

  // Monitor audio levels with Voice Activity Detection
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);

    const now = Date.now();

    // Voice Activity Detection
    if (normalizedLevel > VAD_THRESHOLD) {
      // Speech detected
      silenceStartTimeRef.current = null;

      if (!isSpeakingRef.current) {
        // Start of new speech segment
        isSpeakingRef.current = true;
        speechStartTimeRef.current = now;
        setIsSpeaking(true);
        console.log('[VAD] Speech started');
      }
    } else {
      // Silence detected
      if (isSpeakingRef.current) {
        if (!silenceStartTimeRef.current) {
          silenceStartTimeRef.current = now;
        } else if (now - silenceStartTimeRef.current > SILENCE_DURATION) {
          // End of speech segment after sustained silence
          const speechDuration = now - speechStartTimeRef.current;

          if (speechDuration > MIN_SPEECH_DURATION) {
            const timeSinceLastTranscription = now - lastTranscriptionTimeRef.current;

            // Only transcribe if enough time has passed (cooldown)
            if (timeSinceLastTranscription < TRANSCRIPTION_COOLDOWN) {
              console.log('[VAD] Cooldown active, skipping. Time since last:', timeSinceLastTranscription, 'ms');
            } else {
              console.log('[VAD] Speech ended, duration:', speechDuration, 'ms');
              // Trigger transcription - include header chunks for valid file format
              const newChunks = allChunksRef.current.slice(lastTranscribedChunkIndexRef.current);
              if (newChunks.length > 0) {
                const mimeType = currentMimeTypeRef.current;
                // Combine header chunks with new chunks for valid audio file
                const chunksToTranscribe = [...headerChunksRef.current, ...newChunks];
                const audioBlob = new Blob(chunksToTranscribe, { type: mimeType });
                // Only transcribe if we have enough new audio
                if (audioBlob.size > 10000) {
                  console.log('[VAD] Transcribing with headers, chunks:', chunksToTranscribe.length, 'size:', audioBlob.size);
                  lastTranscriptionTimeRef.current = now;
                  transcribeAudio(audioBlob, true);
                  lastTranscribedChunkIndexRef.current = allChunksRef.current.length;
                } else {
                  console.log('[VAD] Audio too small, skipping:', audioBlob.size);
                }
              }
            }
          } else {
            console.log('[VAD] Speech too short, ignoring:', speechDuration, 'ms');
          }

          // Reset speech tracking (but keep collecting chunks!)
          isSpeakingRef.current = false;
          speechStartTimeRef.current = null;
          silenceStartTimeRef.current = null;
          setIsSpeaking(false);
        }
      }
    }

    if (isRecordingRef.current && !isPausedRef.current) {
      animationRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, []);

  // Get file extension from mimeType
  const getExtensionFromMime = (mime) => {
    if (mime?.includes('mp4')) return 'm4a';
    if (mime?.includes('ogg')) return 'ogg';
    if (mime?.includes('webm')) return 'webm';
    if (mime?.includes('wav')) return 'wav';
    return 'webm';
  };

  // Transcribe audio blob - this transcribes a complete speech segment
  const transcribeAudio = async (audioBlob, isSegmentEnd = false) => {
    if (!audioBlob || audioBlob.size < 1000) {
      console.log('[Transcribe] Skipping small audio chunk:', audioBlob?.size);
      return;
    }

    const extension = getExtensionFromMime(currentMimeTypeRef.current);
    const filename = `recording.${extension}`;
    console.log('[Transcribe] Sending audio blob, size:', audioBlob.size, 'as:', filename, 'segmentEnd:', isSegmentEnd);
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);

      const response = await fetch(`${API_URL}/api/transcribe?provider=${transcriptionProvider}`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      console.log('[Transcribe] Response:', data);

      if (data.text && data.text.trim()) {
        let newText = data.text.trim();

        // Skip common filler/noise transcriptions
        const fillerPhrases = ['you', 'yeah', 'yes', 'no', 'okay', 'ok', 'um', 'uh', 'hmm', 'ah', 'oh', 'right', 'so', 'and', 'the', 'thank you', 'thanks'];
        const lowerText = newText.toLowerCase();
        if (fillerPhrases.includes(lowerText) || newText.length < 5) {
          console.log('[Transcribe] Skipping filler:', newText);
          return;
        }

        // Remove repeated phrases within the text (e.g., "what's her name what's her name" -> "what's her name")
        const words = newText.split(' ');
        if (words.length >= 4) {
          // Check if the text is a repeated phrase
          const halfLen = Math.floor(words.length / 2);
          const firstHalf = words.slice(0, halfLen).join(' ').toLowerCase();
          const secondHalf = words.slice(halfLen, halfLen * 2).join(' ').toLowerCase();
          if (firstHalf === secondHalf) {
            newText = words.slice(0, halfLen).join(' ');
            console.log('[Transcribe] Removed repeated phrase, cleaned:', newText);
          }
        }

        // Only process if this is a completed speech segment with meaningful content (at least 3 words)
        if (isSegmentEnd && newText.length > 10 && words.length >= 3) {
          console.log('[Transcribe] Got text:', newText);

          // Always show the current transcription
          setTranscription(newText);

          // Normalize text for comparison (lowercase, remove punctuation, extra spaces)
          const normalizedText = newText.toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          // Extract key words for fuzzy matching (remove common words)
          const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against', 'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their', 'what', 'which', 'who', 'whom', 'me', 'him', 'her', 'them', 'my', 'his', 'i'];
          const keyWords = normalizedText.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
          const keyWordsSet = new Set(keyWords);

          // Check if this is a duplicate or very similar to previous questions
          const isDuplicate = [...askedQuestionsRef.current].some(prevQ => {
            // Exact match
            if (prevQ === normalizedText) return true;

            // One contains the other (substring check)
            if (prevQ.includes(normalizedText) || normalizedText.includes(prevQ)) return true;

            // First 15 chars match (likely same question with slight variation)
            if (normalizedText.length > 15 && prevQ.length > 15 &&
                normalizedText.substring(0, 15) === prevQ.substring(0, 15)) return true;

            // Key word overlap - if >70% of key words match, it's likely duplicate
            const prevKeyWords = prevQ.split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
            if (keyWords.length >= 3 && prevKeyWords.length >= 3) {
              const overlap = prevKeyWords.filter(w => keyWordsSet.has(w)).length;
              const overlapRatio = overlap / Math.min(keyWords.length, prevKeyWords.length);
              if (overlapRatio > 0.7) return true;
            }

            return false;
          });

          if (!isDuplicate) {
            console.log('[Transcribe] New question detected:', newText);
            askedQuestionsRef.current.add(normalizedText);
            lastTranscriptionRef.current = newText;
            setQuestions(prev => [...prev, newText]);

            // Auto-generate answer for the new question
            autoGenerateAnswer(newText);
          } else {
            console.log('[Transcribe] Duplicate question, skipping:', newText);
          }
        }
      }
    } catch (err) {
      console.error('[Transcribe] Error:', err);
      setError('Transcription failed: ' + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setRecordingDuration(0);

      let stream;

      if (audioSource === 'system') {
        // Capture system audio via BlackHole or similar virtual audio device
        console.log('[Recording] Capturing system audio via virtual device...');
        try {
          // First, get all audio devices and look for BlackHole or system audio
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === 'audioinput');

          // Look for BlackHole or similar virtual audio devices
          const virtualDevice = audioInputs.find(d =>
            d.label.toLowerCase().includes('blackhole') ||
            d.label.toLowerCase().includes('soundflower') ||
            d.label.toLowerCase().includes('loopback') ||
            d.label.toLowerCase().includes('virtual')
          );

          if (virtualDevice) {
            console.log('[Recording] Found virtual audio device:', virtualDevice.label);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: virtualDevice.deviceId },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              }
            });
          } else {
            // Fallback to screen share for tab audio
            console.log('[Recording] No virtual device found, trying screen share...');
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              }
            });
            // Stop video track
            stream.getVideoTracks().forEach(track => track.stop());
          }

          if (stream.getAudioTracks().length === 0) {
            throw new Error('No audio track available.');
          }

          console.log('[Recording] System audio captured successfully');
        } catch (err) {
          console.error('[Recording] System audio capture failed:', err);
          setError('BLACKHOLE_SETUP_NEEDED');
          return;
        }
      } else {
        // Capture microphone (original behavior)
        // First, refresh device list to ensure we have current info
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(prev => ({ ...prev, inputs }));

        // Check if selected mic still exists
        const selectedMicExists = inputs.find(d => d.deviceId === selectedMic);

        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

        // Use selected microphone if it exists, otherwise use default
        if (selectedMic && selectedMicExists) {
          audioConstraints.deviceId = { exact: selectedMic };
          console.log('[Recording] Using selected mic:', selectedMic);
        } else if (inputs.length > 0) {
          // Fall back to first available device
          const fallbackDevice = inputs[0].deviceId;
          audioConstraints.deviceId = { ideal: fallbackDevice };
          setSelectedMic(fallbackDevice);
          console.log('[Recording] Selected mic not found, using fallback:', fallbackDevice);
        }

        console.log('[Recording] Getting microphone stream...');

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
          });
        } catch (firstErr) {
          // If exact device fails, try without device constraint
          console.log('[Recording] First attempt failed, trying default mic');
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }
      }

      streamRef.current = stream;

      console.log('[Recording] Started successfully');

      // Set up audio analyzer (only if not already created for 'both' mode)
      if (!audioContextRef.current) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder - prefer formats that work better with Whisper
      // OGG with opus is well-supported and works in chunks
      const mimeTypes = [
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/webm;codecs=opus',
        'audio/webm',
      ];

      let mimeType = 'audio/webm'; // fallback
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      console.log('[Recording] Using mimeType:', mimeType);
      currentMimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Reset speech tracking (but keep questions history for duplicate detection)
      allChunksRef.current = [];
      headerChunksRef.current = [];
      lastTranscribedSizeRef.current = 0;
      lastTranscribedChunkIndexRef.current = 0;
      lastTranscriptionTimeRef.current = 0;
      isSpeakingRef.current = false;
      speechStartTimeRef.current = null;
      silenceStartTimeRef.current = null;
      // Note: We don't reset askedQuestionsRef here to prevent duplicates across recording sessions

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Always collect ALL chunks for complete audio file
          allChunksRef.current.push(event.data);
          // Store first 3 chunks as headers (they contain format info)
          if (headerChunksRef.current.length < 3) {
            headerChunksRef.current.push(event.data);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[Recording] Stopped');
        // Transcribe any remaining speech when stopped (with headers for valid format)
        const newChunks = allChunksRef.current.slice(lastTranscribedChunkIndexRef.current);
        if (newChunks.length > 0 && isSpeakingRef.current) {
          const chunksToTranscribe = [...headerChunksRef.current, ...newChunks];
          const audioBlob = new Blob(chunksToTranscribe, { type: mimeType });
          if (audioBlob.size > 5000) {
            console.log('[Recording] Final transcription, chunks:', chunksToTranscribe.length, 'size:', audioBlob.size);
            await transcribeAudio(audioBlob, true);
          }
        }
      };

      // Request data frequently for responsive VAD
      mediaRecorder.start(200);

      // PERIODIC TRANSCRIPTION - transcribe every 6 seconds regardless of VAD
      // This ensures we don't miss anything while avoiding rate limits
      periodicTranscribeRef.current = setInterval(() => {
        if (!isRecordingRef.current || isPausedRef.current) return;

        const newChunks = allChunksRef.current.slice(lastTranscribedChunkIndexRef.current);
        if (newChunks.length > 0 && headerChunksRef.current.length > 0) {
          const chunksToTranscribe = [...headerChunksRef.current, ...newChunks];
          const audioBlob = new Blob(chunksToTranscribe, { type: mimeType });

          // Transcribe if we have at least 3KB of new audio
          if (audioBlob.size > 3000) {
            console.log('[Periodic] Transcribing, chunks:', chunksToTranscribe.length, 'size:', audioBlob.size);
            transcribeAudio(audioBlob, true);
            lastTranscribedChunkIndexRef.current = allChunksRef.current.length;
          }
        }
      }, PERIODIC_TRANSCRIBE_INTERVAL);

      // Duration timer
      const durationInterval = setInterval(() => {
        if (isRecordingRef.current && !isPausedRef.current) {
          setRecordingDuration(d => d + 1);
        }
      }, 1000);

      durationIntervalRef.current = durationInterval;

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);

      // Start level monitoring
      monitorAudioLevel();

      console.log('[Recording] Started successfully');
    } catch (err) {
      console.error('[Recording] Error:', err);
      // Provide helpful error messages
      if (err.name === 'NotFoundError' || err.message.includes('not found')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotAllowedError' || err.message.includes('denied')) {
        setError('Microphone permission denied. Please allow microphone access in your browser/system settings.');
      } else {
        setError('Microphone error: ' + err.message);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('[Recording] Stopping...');


    // Clear periodic transcription
    if (periodicTranscribeRef.current) {
      clearInterval(periodicTranscribeRef.current);
      periodicTranscribeRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Reset VAD state
    isSpeakingRef.current = false;
    speechStartTimeRef.current = null;
    silenceStartTimeRef.current = null;
    setIsSpeaking(false);

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (speakerStreamRef.current) {
      speakerStreamRef.current.getTracks().forEach(track => track.stop());
      speakerStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    analyserRef.current = null;
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
  };

  // Toggle pause
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      isPausedRef.current = false;
      setIsPaused(false);
      monitorAudioLevel();
    } else {
      mediaRecorderRef.current.pause();
      isPausedRef.current = true;
      setIsPaused(true);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  // Auto-generate answer with debounce
  const autoGenerateAnswer = (text) => {
    // Clear any pending auto-answer
    if (autoAnswerTimeoutRef.current) {
      clearTimeout(autoAnswerTimeoutRef.current);
    }

    // Only auto-generate if we have meaningful new content
    const minWords = 3;
    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount < minWords) {
      console.log('[AutoAnswer] Not enough words yet:', wordCount);
      return;
    }

    // Don't re-generate for the same text
    if (text === lastAnsweredTextRef.current) {
      console.log('[AutoAnswer] Already answered this text');
      return;
    }

    // Debounce - wait 3s after last transcription before generating
    // This ensures the full question is captured before generating
    autoAnswerTimeoutRef.current = setTimeout(() => {
      console.log('[AutoAnswer] Auto-generating answer for:', text.substring(0, 50) + '...');
      lastAnsweredTextRef.current = text;
      generateAnswerForText(text);
    }, 3000);
  };

  // Generate answer for specific text (used by auto-generate)
  const generateAnswerForText = async (text) => {
    if (!text.trim()) return;

    // CRITICAL: Use ref for sync check to prevent race conditions with async state
    if (isGeneratingRef.current) {
      console.log('[AutoAnswer] Queuing question while generating:', text.substring(0, 30) + '...');
      pendingQuestionsRef.current.push(text);
      return;
    }

    // Set ref IMMEDIATELY (sync) before any async operations
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setAnswer('');
    setError(null);
    let fullAnswer = ''; // Track full answer for history

    try {
      // Build context string from current problem/solution if available
      const contextStr = context ? [
        context.problem ? `[Current ${context.mode === 'system-design' ? 'System Design' : 'Coding'} Problem]: ${context.problem}` : '',
        context.solution ? `[Solution Summary]: ${context.solution}` : '',
        context.code ? `[Code]:\n${context.code}` : '',
      ].filter(Boolean).join('\n\n') : '';

      const response = await fetch(`${API_URL}/api/ascend/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          question: text,
          provider,
          model,
          jobDescription,
          resume,
          prepMaterial: [prepMaterial, contextStr].filter(Boolean).join('\n\n---\n\n'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate answer');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullAnswer += data.chunk;
                setAnswer(prev => prev + data.chunk);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (!e.message.includes('JSON')) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      // Save to conversation history
      if (fullAnswer.trim()) {
        saveToHistory(text, fullAnswer);
      }
    } catch (err) {
      setError('Failed to generate answer: ' + err.message);
    } finally {
      // Check if there are pending questions to process (FIFO)
      if (pendingQuestionsRef.current.length > 0) {
        const pendingText = pendingQuestionsRef.current.shift(); // Get first in queue
        console.log('[AutoAnswer] Processing queued question:', pendingText.substring(0, 30) + '...', `(${pendingQuestionsRef.current.length} remaining)`);
        // CRITICAL: Reset isGeneratingRef BEFORE calling generateAnswerForText
        setTimeout(() => {
          isGeneratingRef.current = false;
          lastAnsweredTextRef.current = pendingText;
          generateAnswerForText(pendingText);
        }, 100);
      } else {
        // Queue is empty, fully reset
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
    }
  };

  // Generate answer from transcription (manual button)
  const generateAnswer = async () => {
    if (!transcription.trim()) {
      setError('No transcription to generate answer from');
      return;
    }

    lastAnsweredTextRef.current = transcription;
    setIsGenerating(true);
    setAnswer('');
    setError(null);
    let fullAnswer = ''; // Track full answer for history
    const questionText = transcription; // Capture before it might change

    try {
      const contextStr2 = context ? [
        context.problem ? `[Current ${context.mode === 'system-design' ? 'System Design' : 'Coding'} Problem]: ${context.problem}` : '',
        context.solution ? `[Solution Summary]: ${context.solution}` : '',
        context.code ? `[Code]:\n${context.code}` : '',
      ].filter(Boolean).join('\n\n') : '';

      const response = await fetch(`${API_URL}/api/ascend/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          question: transcription,
          provider,
          model,
          prepMaterial: contextStr2 || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate answer');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullAnswer += data.chunk;
                setAnswer(prev => prev + data.chunk);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              if (!e.message.includes('JSON')) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      // Save to conversation history
      if (fullAnswer.trim()) {
        saveToHistory(questionText, fullAnswer);
      }
    } catch (err) {
      setError('Failed to generate answer: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear all
  const clearAll = () => {
    setTranscription('');
    setAnswer('');
    setQuestions([]);
    lastTranscriptionRef.current = '';
    lastAnsweredTextRef.current = '';
    lastTranscribedSizeRef.current = 0;
    lastTranscribedChunkIndexRef.current = 0;
    lastTranscriptionTimeRef.current = 0;
    askedQuestionsRef.current = new Set();
    allChunksRef.current = [];
    headerChunksRef.current = [];
    if (autoAnswerTimeoutRef.current) {
      clearTimeout(autoAnswerTimeoutRef.current);
    }
    setError(null);
    setRecordingDuration(0);
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]" style={{
      borderLeft: isDedicatedWindow ? 'none' : '1px solid rgba(100, 116, 139, 0.3)',
    }}>
      {/* Header - Matching other panels, draggable in dedicated window */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]"
        style={isDedicatedWindow ? { WebkitAppRegion: 'drag', paddingTop: '2rem' } : {}}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{
            background: isSpeaking ? '#10b981' : isRecording ? '#ef4444' : '#10b981'
          }}>
            <svg className="w-2.5 h-2.5" style={{ color: '#0c1322' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">Interview</span>
          {isRecording && (
            <>
              <span className="text-xs font-mono text-error-400">{formatDuration(recordingDuration)}</span>
              {isSpeaking && <span className="text-xs text-brand-400">Speaking...</span>}
            </>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-1 text-xs text-brand-400">
              <div className="w-2.5 h-2.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: showHistory ? '#10b981' : '#94a3b8' }}
            title="Conversation History"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Context Banner — shows when copilot has problem/solution context */}
      {context?.problem && (
        <div className="px-3 py-2 border-b border-[var(--border)]" style={{ background: 'var(--accent-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                {context.mode === 'system-design' ? 'System Design' : 'Coding'} Context Loaded
              </span>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {context.problem.slice(0, 80)}{context.problem.length > 80 ? '...' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conversation History Panel */}
      {showHistory && (
        <div className="flex-1 overflow-y-auto p-3 bg-[var(--bg-elevated)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">Conversation History</h3>
            {conversationHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs px-2 py-1 rounded bg-error-500/10 text-error-400 hover:bg-error-500/20 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          {conversationHistory.length === 0 ? (
            <p className="text-xs text-center py-8 text-[var(--text-muted)]">No conversation history yet</p>
          ) : (
            <div className="space-y-3">
              {[...conversationHistory].reverse().map((entry) => (
                <div key={entry.id} className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] overflow-hidden animate-fadeIn">
                  <div className="flex items-center justify-between py-2 px-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="py-3 px-3">
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-info-500/10 text-info-400">Q</span>
                        <span className="text-xs font-semibold uppercase text-info-400">Question</span>
                      </div>
                      <p className="text-xs pl-6 text-[var(--text-primary)]">{entry.question}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-brand-400/10 text-brand-400">A</span>
                        <span className="text-xs font-semibold uppercase text-brand-400">Answer</span>
                      </div>
                      <div className="text-xs pl-6 text-[var(--text-primary)]">{renderMarkdown(entry.answer)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && !showHistory && error !== 'BLACKHOLE_SETUP_NEEDED' && (
        <div className="px-4 py-2 text-sm flex items-center justify-between bg-error-500/10 border-b border-error-500/30 text-error-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-error-400 hover:text-error-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* BlackHole Setup Required */}
      {error === 'BLACKHOLE_SETUP_NEEDED' && !showHistory && (
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-400">BlackHole Required for Interviewer Audio</span>
              </div>
              <p className="text-xs text-[var(--text-primary)] mb-3">
                To capture audio from Google Meet/Zoom, you need to install BlackHole (a free virtual audio driver) and configure it.
              </p>
              <button
                onClick={() => setShowBlackholeSetup(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[var(--text-primary)] text-xs font-medium rounded-lg transition-colors"
              >
                View Setup Guide
              </button>
            </div>
            <button onClick={() => setError(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content - hidden when showing history or context */}
      {!showHistory && (
        <>
      {/* Hidden file inputs */}
      <input type="file" ref={jdFileRef} className="hidden" accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => { if (e.target.files?.[0]) { handleFileUpload(e.target.files[0], setJobDescription, 'jd'); e.target.value = ''; }}} />
      <input type="file" ref={resumeFileRef} className="hidden" accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => { if (e.target.files?.[0]) { handleFileUpload(e.target.files[0], setResume, 'resume'); e.target.value = ''; }}} />
      <input type="file" ref={prepFileRef} className="hidden" accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => { if (e.target.files?.[0]) { handleFileUpload(e.target.files[0], setPrepMaterial, 'prep'); e.target.value = ''; }}} />

      {/* Top Strip: Two Cards Side by Side */}
      <div className="flex border-b border-[var(--border)]">
        {/* DOCS SECTION (LEFT) */}
        <div className="flex-1 p-2 bg-[var(--bg-elevated)] border-r border-[var(--border)]">
          <div className="flex gap-1">
            <button
              onClick={() => setExpandedContext(expandedContext === 'jd' ? null : 'jd')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                expandedContext === 'jd' ? 'bg-info-500 text-[var(--text-primary)]' : jobDescription ? 'bg-info-500/20 text-info-400 border border-info-500/50' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              JD {jobDescription && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </button>
            <button
              onClick={() => setExpandedContext(expandedContext === 'resume' ? null : 'resume')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                expandedContext === 'resume' ? 'bg-info-500 text-[var(--text-primary)]' : resume ? 'bg-info-500/20 text-info-400 border border-info-500/50' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              CV {resume && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </button>
            <button
              onClick={() => setExpandedContext(expandedContext === 'prep' ? null : 'prep')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                expandedContext === 'prep' ? 'bg-info-500 text-[var(--text-primary)]' : prepMaterial ? 'bg-info-500/20 text-info-400 border border-info-500/50' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              Prep {prepMaterial && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </button>
          </div>
          {/* Expanded doc input */}
          {expandedContext && (
            <div className="mt-2 flex gap-2 items-start">
              <textarea
                value={expandedContext === 'jd' ? jobDescription : expandedContext === 'resume' ? resume : prepMaterial}
                onChange={(e) => {
                  if (expandedContext === 'jd') setJobDescription(e.target.value);
                  else if (expandedContext === 'resume') setResume(e.target.value);
                  else setPrepMaterial(e.target.value);
                }}
                placeholder={expandedContext === 'jd' ? 'Paste JD...' : expandedContext === 'resume' ? 'Paste resume...' : 'Prep notes...'}
                className="flex-1 h-20 px-2 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:border-info-500 resize-none"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    if (expandedContext === 'jd') jdFileRef.current?.click();
                    else if (expandedContext === 'resume') resumeFileRef.current?.click();
                    else prepFileRef.current?.click();
                  }}
                  className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-info-500/20 text-[var(--text-secondary)] hover:text-info-400 border border-[var(--border)]"
                  title="Upload PDF/DOCX"
                >
                  {uploadingFile === expandedContext ? (
                    <div className="w-4 h-4 border-2 border-info-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (expandedContext === 'jd') setJobDescription('');
                    else if (expandedContext === 'resume') setResume('');
                    else setPrepMaterial('');
                  }}
                  className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-error-500/20 text-[var(--text-secondary)] hover:text-error-400 border border-[var(--border)]"
                  title="Clear"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VOICE SECTION (RIGHT) */}
        <div className="flex-1 p-2 bg-[var(--bg-elevated)]">
          <div className="flex gap-1 items-center">
            <button
              onClick={() => setAudioSource('system')}
              disabled={isRecording}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                audioSource === 'system'
                  ? 'bg-brand-400 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              Interviewer
            </button>
            <button
              onClick={() => setAudioSource('mic')}
              disabled={isRecording}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                audioSource === 'mic'
                  ? 'bg-brand-400 text-[var(--text-primary)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              Speaker
            </button>
            <button
              onClick={() => setShowBlackholeSetup(true)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
              title="Setup guide for capturing interviewer audio"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Controls Container */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-center">
        <div className="w-full max-w-md px-4 py-3 space-y-3">
          {/* Mic Selection */}
          {audioSource === 'mic' && audioDevices.inputs.length > 1 && (
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              disabled={isRecording}
              className="w-full px-2 py-1.5 rounded text-xs focus:outline-none disabled:opacity-50 truncate bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              {audioDevices.inputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Mic ${device.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}

          {/* Transcription Provider Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] shrink-0">STT:</span>
            <div className="flex rounded-lg overflow-hidden border border-[var(--border)] flex-1">
              <button
                onClick={() => setTranscriptionProvider('openai')}
                disabled={isRecording}
                title="OpenAI Whisper API"
                className={`flex-1 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  transcriptionProvider === 'openai'
                    ? 'bg-brand-400 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                Whisper
              </button>
              <button
                onClick={() => setTranscriptionProvider('deepgram')}
                disabled={isRecording}
                title="Deepgram Nova-2 API"
                className={`flex-1 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  transcriptionProvider === 'deepgram'
                    ? 'bg-brand-400 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                Deepgram
              </button>
            </div>
          </div>

          {/* Record Button */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" />
              </svg>
              Start
            </button>
          ) : (
            <div className="w-full">
              {/* Recording Status */}
              <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg bg-error-500/10 border border-error-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-error-500 animate-pulse" />
                  <span className="text-xs font-medium text-error-400">Recording {audioSource === 'system' ? 'Interviewer' : 'Mic'}...</span>
                  <span className="text-xs font-mono text-error-300">{formatDuration(recordingDuration)}</span>
                </div>
                {isSpeaking && <span className="text-xs text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">Speaking</span>}
              </div>

              {/* Audio Level Indicator */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs text-[var(--text-muted)]">Level:</span>
                <div className="flex-1 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-75 rounded-full"
                    style={{
                      width: `${Math.min(audioLevel * 100 * 3, 100)}%`,
                      background: isSpeaking ? 'linear-gradient(90deg, #10b981, #F97316)' : '#64748b'
                    }}
                  />
                </div>
              </div>

              {/* Stop/Pause Controls */}
              <div className="flex gap-2">
                <button
                  onClick={togglePause}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isPaused ? 'bg-brand-400 text-[var(--text-primary)]' : 'bg-warning-500 text-[var(--text-primary)]'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1"/>
                        <rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-gray-300"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                  </svg>
                  Stop
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  title="Clear"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content - Side by Side Layout */}
      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Questions Section - Left side, 40% width */}
        <div className="w-[40%] shrink-0 border-r border-[var(--border)]">
          <div className="h-full flex flex-col">
            <div className="px-3 py-1 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)]">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Questions
              </span>
              {questions.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {questions.length}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 bg-[var(--bg-surface)]">
              {questions.length > 0 ? (
                <div className="space-y-1.5">
                  {/* Show all questions in side panel - scroll if needed */}
                  {questions.map((q, idx) => {
                    const actualNum = idx + 1;
                    return (
                      <div key={actualNum} className="px-2 py-1 rounded bg-[var(--bg-elevated)] border-l-2 border-info-400 animate-fadeIn">
                        <p className="text-xs leading-snug text-[var(--text-primary)]">
                          <span className="text-info-400 font-medium mr-1">Q{actualNum}.</span>
                          {q}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs italic text-[var(--text-muted)]">
                  {isRecording ? (isSpeaking ? 'Listening...' : 'Waiting...') : 'Click Record'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Answer Section - Right side, takes remaining 60% width */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--border)] bg-gradient-to-r from-brand-500/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-brand-400/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Answer
                </span>
              </div>
              {isGenerating && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-400/10">
                  <div className="w-2 h-2 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-brand-400">Thinking...</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-[var(--bg-elevated)]/30">
              {answer ? (
                <div className="p-4">
                  <div className="prose prose-sm prose-invert max-w-none answer-content">
                    {renderMarkdown(answer)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">
                    {questions.length > 0 ? 'Processing...' : 'Ready to help'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {questions.length > 0 ? 'Generating expert answer...' : 'Click Record and ask a question'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* BlackHole Setup Modal */}
      {showBlackholeSetup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-elevated)] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--border)]">
            <div className="sticky top-0 bg-[var(--bg-elevated)] px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">BlackHole Setup Guide</h2>
              <button
                onClick={() => setShowBlackholeSetup(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              <p className="text-sm text-[var(--text-primary)]">
                BlackHole is a free virtual audio driver that lets Ascend capture audio from Google Meet, Zoom, and other apps.
              </p>

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-500 text-[var(--text-primary)] text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Download & Install BlackHole</h3>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">Download BlackHole 2ch (free) from the official website:</p>
                  <a
                    href="https://existential.audio/blackhole/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg text-sm text-brand-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    existential.audio/blackhole
                  </a>
                  <p className="text-xs text-[var(--text-muted)]">Run the installer and restart your Mac if prompted.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-500 text-[var(--text-primary)] text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Create Multi-Output Device</h3>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">This lets you hear audio AND capture it simultaneously:</p>
                  <ol className="text-xs text-[var(--text-primary)] space-y-1.5 list-decimal list-inside">
                    <li>Open <span className="text-brand-400 font-medium">Audio MIDI Setup</span> (search in Spotlight)</li>
                    <li>Click the <span className="text-brand-400 font-medium">+</span> button at bottom left</li>
                    <li>Select <span className="text-brand-400 font-medium">"Create Multi-Output Device"</span></li>
                    <li>Check both <span className="text-brand-400 font-medium">BlackHole 2ch</span> and your <span className="text-brand-400 font-medium">speakers/headphones</span></li>
                    <li>Right-click the Multi-Output Device → <span className="text-brand-400 font-medium">"Use This Device For Sound Output"</span></li>
                  </ol>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-500 text-[var(--text-primary)] text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-sm font-medium text-[var(--text-primary)]">Configure Ascend</h3>
                </div>
                <div className="ml-8 space-y-2">
                  <ol className="text-xs text-[var(--text-primary)] space-y-1.5 list-decimal list-inside">
                    <li>In Ascend, click the <span className="text-brand-400 font-medium">"Interviewer"</span> button (not "Speaker")</li>
                    <li>Click the <span className="text-brand-400 font-medium">Record</span> button</li>
                    <li>Ascend will now capture both your voice AND the interviewer's voice</li>
                  </ol>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="bg-[var(--bg-elevated)] rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-medium text-[var(--text-primary)]">Troubleshooting</h4>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                  <li>• If you can't hear audio: Make sure your speakers/headphones are checked in the Multi-Output Device</li>
                  <li>• If BlackHole doesn't appear: Restart your Mac after installation</li>
                  <li>• Volume too low? Adjust the master volume slider in Audio MIDI Setup</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setShowBlackholeSetup(false);
                  setError(null);
                }}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-[var(--text-primary)] font-medium rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
