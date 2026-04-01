import { useState, useRef, useCallback, useEffect } from 'react';
import { documentsAPI } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  filename: string;
  size: number;
  preview: string;
}

export function DocumentUpload() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const result = await documentsAPI.list(token);
      setDocuments(result.documents);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    }
  }, [token]);

  // Load documents on mount and when dropdown opens
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      await documentsAPI.upload(token, file);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (filename: string) => {
    if (!token) return;
    try {
      await documentsAPI.delete(token, filename);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 text-sm font-bold rounded border transition-colors ${documents.length > 0 ? 'bg-emerald-500 text-white border-emerald-600' : 'text-white hover:text-white border-gray-600'}`}
        title={`Prep docs (${documents.length})`}
      >
        <DocIcon />
        <span className="hidden sm:inline">{documents.length > 0 ? documents.length : 'Docs'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-gray-200 shadow-lg z-50 rounded">
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-bold text-gray-700">
                PREPARATION DOCS
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Upload your interview prep guides. Answers will come from these first.
            </p>
          </div>

          {/* Upload button */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx,.pdf,.md"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full btn btn-primary text-sm py-1.5"
            >
              {isLoading ? 'Uploading...' : '+ Upload Document'}
            </button>
            <p className="text-sm text-gray-400 mt-1 text-center">
              .txt, .docx, .pdf, .md (max 5MB)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 bg-rose/10 text-rose text-sm">
              {error}
            </div>
          )}

          {/* Documents list */}
          <div className="max-h-48 overflow-y-auto">
            {documents.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                No documents uploaded yet
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.filename}
                  className="flex items-start gap-2 p-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium text-gray-700 truncate">
                      {doc.filename}
                    </div>
                    <div className="text-sm text-gray-400">
                      {Math.round(doc.size / 1024)}KB
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.filename)}
                    className="text-gray-400 hover:text-rose shrink-0"
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DocIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
