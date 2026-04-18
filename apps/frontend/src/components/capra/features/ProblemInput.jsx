import { useState, useEffect, useRef, useCallback } from 'react';

const LANGUAGES = [
  { value: 'auto', label: 'Auto' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JS' },
  { value: 'typescript', label: 'TS' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'terraform', label: 'Terraform' },
  { value: 'jenkins', label: 'Jenkins' },
  { value: 'yaml', label: 'YAML' },
];

export default function ProblemInput({ onSubmit, onFetchUrl, onScreenshot, onClear, isLoading, extractedText, onExtractedTextClear, shouldClear, hasSolution, expanded, onToggleExpand, ascendMode, loadedProblem, detailLevel = 'basic', language = 'auto' }) {
  const [problemText, setProblemText] = useState(loadedProblem || '');
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Get first line for collapsed preview
  const getPreviewText = () => {
    if (!problemText) return '';
    const firstLine = problemText.split('\n')[0];
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  };

  // Clean up text - remove extra empty lines and whitespace
  const cleanupText = useCallback((text) => {
    if (!text) return '';
    return text
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, []);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lineHeight = 22;
    const minHeight = lineHeight * 2 + 16;
    const maxHeight = expanded !== false ? 600 : 400;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [expanded]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [problemText, expanded, adjustTextareaHeight]);

  useEffect(() => {
    if (extractedText) {
      const cleaned = cleanupText(extractedText);
      setProblemText(cleaned);
      setUrl('');
      setActiveTab('text');
      onExtractedTextClear?.();
    }
  }, [extractedText, onExtractedTextClear, cleanupText]);

  useEffect(() => {
    if (loadedProblem) {
      const cleaned = cleanupText(loadedProblem);
      setProblemText(cleaned);
      setUrl('');
      setActiveTab('text');
    }
  }, [loadedProblem, cleanupText]);

  const prevShouldClear = useRef(shouldClear);
  useEffect(() => {
    if (shouldClear && shouldClear !== prevShouldClear.current) {
      setProblemText('');
      setUrl('');
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    prevShouldClear.current = shouldClear;
  }, [shouldClear]);

  useEffect(() => {
    if (!isSelectingFile) return;

    const handleFocus = () => {
      setTimeout(() => {
        if (!fileInputRef.current?.files?.length) {
          setIsSelectingFile(false);
        }
      }, 300);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isSelectingFile]);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (problemText.trim() && !isLoading) {
      onSubmit(problemText, language, detailLevel);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onFetchUrl(url, language, detailLevel);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const handleFileChange = (e) => {
    setIsSelectingFile(false);
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    onScreenshot(file, language, detailLevel);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabSwitch = (tabId) => {
    if (tabId === activeTab) {
      if (tabId === 'screenshot' && !preview) {
        setIsSelectingFile(true);
        fileInputRef.current?.click();
      }
      return;
    }
    setProblemText('');
    setUrl('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTab(tabId);
    onClear?.();

    if (tabId === 'screenshot') {
      setIsSelectingFile(true);
      setTimeout(() => fileInputRef.current?.click(), 50);
    }
  };

  const tabs = [
    { id: 'text', label: 'Text', icon: TextIcon },
    { id: 'url', label: 'URL', icon: LinkIcon },
    { id: 'screenshot', label: 'Image', icon: ImageIcon },
  ];

  // Collapsed view
  if (expanded === false) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-secondary)] truncate">{problemText ? getPreviewText() : <span className="text-[var(--text-muted)] italic">No problem text</span>}</p>
        </div>
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-400/10 rounded-lg border border-dashed border-brand-400/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-1 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`
                    landing-body flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 min-h-[36px] touch:min-h-[40px]
                    ${activeTab === tab.id
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Collapse button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors min-h-[36px] min-w-[36px] touch:min-h-[40px] touch:min-w-[40px] flex items-center justify-center"
              title="Collapse"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}

          {/* Clear button */}
          {(problemText || url || preview) && (
            <button
              onClick={() => {
                setProblemText('');
                setUrl('');
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                onClear?.();
              }}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px] min-w-[36px] touch:min-h-[40px] touch:min-w-[40px] flex items-center justify-center"
              title="Clear"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col">
        {activeTab === 'text' && (
          <form onSubmit={handleTextSubmit} className="flex flex-col">
            <textarea
              ref={textareaRef}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder={ascendMode === 'system-design' ? 'Describe your system design problem...' : 'Paste coding problem...'}
              className="landing-body w-full px-4 py-3 resize-none rounded-xl text-sm bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[var(--accent)]/40 transition-all shadow-sm"
              style={{
                minHeight: '60px',
                maxHeight: window.matchMedia?.('(max-width: 1024px)')?.matches ? '40vh' : (expanded !== false ? '600px' : '400px'),
                lineHeight: '1.6',
              }}
              spellCheck="false"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between mt-3 flex-shrink-0">
              <span className="text-xs text-[var(--text-muted)]">
                {problemText.length > 0 && `${problemText.length} chars`}
              </span>
              <button
                type="submit"
                disabled={isLoading || !problemText.trim()}
                className="landing-body px-6 py-2.5 text-sm font-bold text-white rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 disabled:hover:translate-y-0 disabled:hover:shadow-none touch:min-h-[44px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {ascendMode === 'system-design' ? 'Designing...' : 'Coding...'}
                  </span>
                ) : ascendMode === 'system-design' ? 'Design' : 'Code'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'url' && (
          <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
              className="w-full px-4 py-3 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400/50 transition-all"
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isLoading ? 'Fetching...' : ascendMode === 'system-design' ? 'Fetch & Design' : 'Fetch & Code'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'screenshot' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {preview ? (
              <div className="relative rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)]" style={{ maxHeight: '300px' }}>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '300px', display: 'block' }}
                />
                <button
                  onClick={clearPreview}
                  disabled={isLoading}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-[var(--text-primary)] transition-colors backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : isSelectingFile ? (
              <div className="flex-1 flex items-center justify-center py-8 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Select an image...
                </span>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => { setIsSelectingFile(true); fileInputRef.current?.click(); }}
                className={`
                  flex-1 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all py-10
                  border-2 border-dashed
                  ${isDragging
                    ? 'border-brand-500 bg-brand-50 '
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-brand-400 hover:bg-brand-50/50 '
                  }
                `}
              >
                <div className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors
                  ${isDragging ? 'bg-brand-100 ' : 'bg-[var(--bg-elevated)] '}
                `}>
                  <svg className={`w-7 h-7 ${isDragging ? 'text-brand-600' : 'text-[var(--text-muted)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)]">Drop image or click to upload</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">PNG, JPG up to 10MB</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function TextIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LinkIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ImageIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
