import { useState, useMemo } from 'react';

/**
 * Modal for viewing, loading, and managing saved system design sessions
 */
export default function SavedSystemDesignsModal({
  isOpen,
  onClose,
  sessions,
  onLoadSession,
  onDeleteSession,
  onClearAll
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;

    const query = searchQuery.toLowerCase();
    return sessions.filter(session =>
      session.title?.toLowerCase().includes(query) ||
      session.problem?.toLowerCase().includes(query) ||
      session.systemDesign?.overview?.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleDelete = (sessionId) => {
    if (deleteConfirmId === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(sessionId);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (confirmClearAll) {
      onClearAll();
      setConfirmClearAll(false);
      onClose();
    } else {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col bg-white border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Saved System Designs</h2>
            <p className="text-sm text-gray-600">
              {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search saved designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 bg-gray-200 border border-gray-200 text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchQuery ? 'No matching designs found' : 'No saved system designs yet'}
              </p>
              {!searchQuery && (
                <p className="text-sm mt-1 text-gray-500">
                  Generate a system design to save it automatically
                </p>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="group rounded-lg p-4 transition-all cursor-pointer bg-gray-100 border border-gray-200 hover:bg-gray-100 hover:border-gray-200"
                onClick={() => {
                  onLoadSession(session.id);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate transition-colors text-gray-900 group-hover:text-brand-400">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{formatDate(session.timestamp)}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        session.detailLevel === 'full'
                          ? 'bg-brand-400/10 text-brand-400'
                          : 'bg-info-500/10 text-info-400'
                      }`}>
                        {session.detailLevel === 'full' ? 'Full Design' : 'Basic'}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{session.source}</span>
                      {session.qaHistory?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{session.qaHistory.length} Q&A</span>
                        </>
                      )}
                    </div>
                    {session.systemDesign?.overview && (
                      <p className="text-sm mt-2 line-clamp-2 text-gray-600">
                        {session.systemDesign.overview}
                      </p>
                    )}
                  </div>

                  {/* Actions - Always visible */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        deleteConfirmId === session.id
                          ? 'bg-error-500/10 text-error-400 border border-error-500/30'
                          : 'text-gray-500 hover:text-error-400 hover:bg-error-500/10 border border-transparent'
                      }`}
                      title={deleteConfirmId === session.id ? 'Click again to confirm' : 'Delete'}
                    >
                      {deleteConfirmId === session.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Preview tags */}
                {session.systemDesign && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {session.systemDesign.requirements && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                        Requirements
                      </span>
                    )}
                    {session.systemDesign.apiDesign?.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                        {session.systemDesign.apiDesign.length} API endpoints
                      </span>
                    )}
                    {session.systemDesign.dataModel?.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                        {session.systemDesign.dataModel.length} tables
                      </span>
                    )}
                    {session.systemDesign.diagram && (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                        Diagram
                      </span>
                    )}
                    {session.eraserDiagram && (
                      <span className="px-2 py-0.5 rounded text-xs bg-brand-400/10 text-brand-400">
                        Eraser.io
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-4 flex justify-end items-center border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClearAll}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                confirmClearAll
                  ? 'bg-error-500/10 text-error-400 border border-error-500/30'
                  : 'text-gray-500 hover:text-error-400 hover:bg-error-500/10 border border-transparent'
              }`}
            >
              {confirmClearAll ? 'Click to confirm clear all' : 'Clear All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
