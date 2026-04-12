import { useState, useRef, useCallback } from 'react';

type InputMode = 'paste' | 'url' | 'image';

interface ProblemInputProps {
  /** Current text value (paste / extracted text) */
  value: string;
  /** Called when the text value changes */
  onChange: (value: string) => void;
  /** Called when the user clicks Submit */
  onSubmit: (value: string) => void;
  /** Placeholder for the paste textarea */
  placeholder?: string;
  /** Which input tabs to show (defaults to all three) */
  tabs?: InputMode[];
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** Label for the submit button */
  submitLabel?: string;
  /** Whether the submit action is in progress */
  isLoading?: boolean;
  /** Callback to fetch problem text from a URL (required if 'url' tab is enabled) */
  onFetchUrl?: (url: string) => Promise<string>;
  /** Callback to extract text from an image file (required if 'image' tab is enabled) */
  onExtractImage?: (file: File) => Promise<string>;
}

const TAB_LABELS: Record<InputMode, string> = {
  paste: 'Paste',
  url: 'URL',
  image: 'Image',
};

/**
 * Reusable multi-mode problem input component.
 *
 * Supports three input modes toggled via tabs:
 *   - **Paste**: textarea for direct text input
 *   - **URL**: text input + Fetch button (calls `onFetchUrl`)
 *   - **Image**: drag-and-drop / click-to-upload area (calls `onExtractImage`)
 *
 * After text is obtained (via any mode), the user clicks the submit button
 * which calls `onSubmit` with the current value.
 */
export function ProblemInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Paste your problem here...',
  tabs = ['paste', 'url', 'image'],
  className = '',
  submitLabel = 'Submit',
  isLoading = false,
  onFetchUrl,
  onExtractImage,
}: ProblemInputProps) {
  const [activeTab, setActiveTab] = useState<InputMode>(tabs[0] || 'paste');
  const [urlValue, setUrlValue] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL Fetch ──────────────────────────────────────────────────────────

  const handleFetchUrl = useCallback(async () => {
    if (!urlValue.trim() || !onFetchUrl) return;
    setIsProcessing(true);
    setError(null);
    try {
      const text = await onFetchUrl(urlValue.trim());
      onChange(text);
      setActiveTab('paste');
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch from URL');
    } finally {
      setIsProcessing(false);
    }
  }, [urlValue, onFetchUrl, onChange]);

  // ── Image Handling ─────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleExtractImage = useCallback(async () => {
    if (!imageFile || !onExtractImage) return;
    setIsProcessing(true);
    setError(null);
    try {
      const text = await onExtractImage(imageFile);
      onChange(text);
      setActiveTab('paste');
    } catch (err: any) {
      setError(err?.message || 'Failed to extract text from image');
    } finally {
      setIsProcessing(false);
    }
  }, [imageFile, onExtractImage, onChange]);

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    onSubmit(value.trim());
  }, [value, onSubmit]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tab Switcher */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      {/* ── Paste Mode ── */}
      {activeTab === 'paste' && (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[180px] md:h-[220px] bg-white border border-gray-200 rounded-lg p-3 text-gray-900 text-xs md:text-sm leading-relaxed placeholder:text-gray-400 resize-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 focus:outline-none transition-all"
        />
      )}

      {/* ── URL Mode ── */}
      {activeTab === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-xs md:text-sm placeholder:text-gray-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 focus:outline-none transition-all"
          />
          <button
            onClick={handleFetchUrl}
            disabled={isProcessing || !urlValue.trim()}
            className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Loading...' : 'Fetch'}
          </button>
        </div>
      )}

      {/* ── Image Mode ── */}
      {activeTab === 'image' && (
        <div className="space-y-2">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400/50 hover:bg-emerald-50/30 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Problem"
                className="max-h-32 mx-auto rounded-lg"
              />
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-xs">
                  Drop image or click to upload
                </p>
              </div>
            )}
          </div>
          {imageFile && (
            <button
              onClick={handleExtractImage}
              disabled={isProcessing}
              className="w-full py-2 bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 transition-all"
            >
              {isProcessing ? 'Extracting...' : 'Extract Text'}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !value.trim()}
        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
}
