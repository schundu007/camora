import { useState, useRef, useEffect } from 'react';

export default function ScreenshotUpload({ onUpload, isLoading, shouldClear }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (shouldClear) {
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [shouldClear]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    onUpload(file);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-24 object-contain rounded"
            style={{ background: '#f5f5f5' }}
          />
          <button
            onClick={clearPreview}
            disabled={isLoading}
            className="absolute top-1 right-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
            style={{ background: '#ffffff', color: '#666666', border: '1px solid #e5e5e5' }}
          >
            Clear
          </button>
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded"
              style={{ background: 'rgba(0,0,0,0.7)' }}
            >
              <span className="text-xs font-medium" style={{ color: '#10b981' }}>Analyzing...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragging ? '#10b981' : 'rgba(255,255,255,0.15)',
            background: isDragging ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
          }}
        >
          <span className="text-xs font-medium" style={{ color: '#a0a0a0' }}>
            Drop screenshot or click
          </span>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
