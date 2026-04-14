import { useState, useRef } from 'react';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
import { getAuthHeaders } from '../../../utils/authHeaders.js';


const INPUT_FIELDS = [
  { id: 'jobDescription', label: 'Job Description', icon: 'briefcase', required: true },
  { id: 'resume', label: 'Resume', icon: 'document', required: true },
  { id: 'coverLetter', label: 'Cover Letter', icon: 'letter', required: false },
  { id: 'prepMaterials', label: 'Prep Materials', icon: 'notes', required: false },
];

const ICONS = {
  briefcase: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  letter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  notes: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  upload: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
};

export default function InputPanel({ inputs, onChange, hasInputs }) {
  const [dragOver, setDragOver] = useState(null);
  const fileInputRefs = useRef({});
  const docFileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(null);
  const [extractingDoc, setExtractingDoc] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editText, setEditText] = useState('');

  const extractTextFromFile = async (file, fieldId) => {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.txt') || filename.endsWith('.md')) {
      try {
        const text = await file.text();
        onChange(fieldId, text);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
      return;
    }

    if (filename.endsWith('.pdf') || filename.endsWith('.docx')) {
      setExtracting(fieldId);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(API_URL + '/api/extract', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          onChange(fieldId, data.text);
        }
      } catch (err) {
        console.error('Failed to extract:', err);
      } finally {
        setExtracting(null);
      }
    }
  };

  const handleDrop = async (e, fieldId) => {
    e.preventDefault();
    setDragOver(null);
    const files = Array.from(e.dataTransfer.files);
    const supportedFile = files.find(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.pdf') || name.endsWith('.docx');
    });
    if (supportedFile) await extractTextFromFile(supportedFile, fieldId);
  };

  const handleFileSelect = async (e, fieldId) => {
    const file = e.target.files?.[0];
    if (file) {
      await extractTextFromFile(file, fieldId);
      // Close the modal after successful file upload
      setEditingField(null);
      setEditText('');
    }
    e.target.value = '';
  };

  const handleDocUpload = async (files) => {
    setExtractingDoc(true);
    const currentDocs = inputs.documentation || [];
    const newDocs = [];

    for (const file of files) {
      const filename = file.name.toLowerCase();
      let content = '';
      try {
        if (filename.endsWith('.txt') || filename.endsWith('.md')) {
          content = await file.text();
        } else if (filename.endsWith('.pdf') || filename.endsWith('.docx')) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(API_URL + '/api/extract', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData,
          });
          if (response.ok) {
            const data = await response.json();
            content = data.text;
          }
        }
        if (content) newDocs.push({ name: file.name, content });
      } catch (err) {
        console.error('Error:', file.name, err);
      }
    }

    if (newDocs.length > 0) onChange('documentation', [...currentDocs, ...newDocs]);
    setExtractingDoc(false);
  };

  const handleDocDrop = async (e) => {
    e.preventDefault();
    setDragOver(null);
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.pdf') || name.endsWith('.docx');
    });
    if (files.length > 0) await handleDocUpload(files);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-elevated)' }}>
      {/* Header - matches Coding/Design panel headers */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Materials
          </span>
        </div>
        {hasInputs && (
          <span style={{
            fontSize: '0.875rem',
            padding: '2px 8px',
            background: '#dcfce7',
            color: '#16a34a',
            borderRadius: '4px',
            fontWeight: 500
          }}>
            Ready
          </span>
        )}
      </div>

      {/* Cards Grid - Light background matching Coding/Design */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--bg-elevated)' }}>
        <div className="grid grid-cols-2 gap-3">
          {INPUT_FIELDS.map((field) => {
            const hasContent = inputs[field.id]?.trim();
            const wordCount = hasContent ? inputs[field.id].split(/\s+/).filter(w => w).length : 0;
            const isDragging = dragOver === field.id;
            const isLoading = extracting === field.id;

            return (
              <div
                key={field.id}
                className="rounded-lg transition-all cursor-pointer"
                style={{
                  background: hasContent ? '#dcfce7' : 'var(--bg-surface)',
                  border: isDragging
                    ? '2px dashed #10b981'
                    : hasContent
                      ? '1px solid #86efac'
                      : '1px solid #e5e5e5',
                  padding: '16px',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(field.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(e, field.id)}
                onClick={() => {
                  if (!hasContent) {
                    setEditingField(field.id);
                    setEditText('');
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mb-2"
                      style={{ borderColor: '#10b981', borderTopColor: 'transparent' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Processing...</span>
                  </>
                ) : hasContent ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                      style={{ background: '#bbf7d0', color: '#16a34a' }}
                    >
                      {ICONS.check}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--content-text)' }}>{field.label}</span>
                    <span style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '2px' }}>{wordCount.toLocaleString()} words</span>
                    <button
                      className="mt-2 px-3 py-1 rounded text-xs transition-all hover:bg-[var(--bg-elevated)]/50"
                      style={{ background: 'rgba(255,255,255,0.5)', color: 'var(--text-secondary)' }}
                      onClick={(e) => { e.stopPropagation(); onChange(field.id, ''); }}
                    >
                      Replace
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      {ICONS[field.icon]}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--content-text)' }}>
                      {field.label}
                      {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>Drop or click</span>
                  </>
                )}
                <input
                  ref={el => fileInputRefs.current[field.id] = el}
                  type="file"
                  accept=".txt,.md,.pdf,.docx"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, field.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Documentation Section */}
        <div className="mt-3">
          <div
            className="rounded-lg transition-all"
            style={{
              background: inputs.documentation?.length > 0 ? '#f0fdf4' : 'var(--bg-surface)',
              border: dragOver === 'documentation'
                ? '2px dashed #10b981'
                : inputs.documentation?.length > 0
                  ? '1px solid #86efac'
                  : '1px dashed #d1d5db',
              padding: '12px',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver('documentation'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={handleDocDrop}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Study Materials
              </span>
              {inputs.documentation?.length > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {inputs.documentation.length} files
                </span>
              )}
            </div>

            {extractingDoc ? (
              <div className="flex items-center justify-center py-4">
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2"
                  style={{ borderColor: '#10b981', borderTopColor: 'transparent' }}
                />
                <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Processing...</span>
              </div>
            ) : inputs.documentation?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {inputs.documentation.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-1 rounded"
                    style={{ background: 'var(--content-bg)', border: '1px solid var(--border)' }}
                  >
                    <span style={{ fontSize: '0.875rem', color: 'var(--content-text)' }}>{doc.name}</span>
                    <button
                      onClick={() => {
                        const docs = inputs.documentation.filter((_, i) => i !== idx);
                        onChange('documentation', docs);
                      }}
                      className="p-0.5 rounded hover:bg-red-50"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {ICONS.x}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => docFileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{ background: '#10b981', color: '#ffffff' }}
                >
                  {ICONS.plus}
                  <span>Add</span>
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-4 cursor-pointer"
                onClick={() => docFileInputRef.current?.click()}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {ICONS.upload}
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Drop files or click</span>
              </div>
            )}
            <input
              ref={docFileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) handleDocUpload(files);
                e.target.value = '';
              }}
            />
          </div>

        </div>
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-center gap-2">
          {hasInputs ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
              <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Select a section to generate</span>
            </>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Add JD & Resume to start</span>
          )}
        </div>
      </div>

      {/* Text Input Modal */}
      {editingField && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setEditingField(null)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-lg shadow-xl w-full max-w-2xl mx-4"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: 'var(--content-text)' }}>
                {INPUT_FIELDS.find(f => f.id === editingField)?.label}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRefs.current[editingField]?.click()}
                  className="px-3 py-1.5 rounded text-sm"
                  style={{ background: 'var(--bg-elevated)', color: '#666' }}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)]"
                >
                  {ICONS.x}
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder={`Paste your ${INPUT_FIELDS.find(f => f.id === editingField)?.label.toLowerCase()} here...`}
                className="w-full rounded-lg p-3 text-sm resize-none"
                style={{
                  height: '300px',
                  border: '1px solid var(--border)',
                  background: '#fafafa',
                  color: 'var(--content-text)'
                }}
              />
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setEditingField(null)}
                className="px-4 py-2 rounded text-sm"
                style={{ background: 'var(--bg-elevated)', color: '#666' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editText.trim()) {
                    onChange(editingField, editText.trim());
                  }
                  setEditingField(null);
                  setEditText('');
                }}
                className="px-4 py-2 rounded text-sm text-[var(--text-primary)]"
                style={{ background: '#10b981' }}
                disabled={!editText.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
