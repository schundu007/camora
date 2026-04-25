import { useState } from 'react';
import { MicrophoneSelector } from '@/components/lumora/audio/MicrophoneSelector';
import { VoiceEnrollment } from '@/components/lumora/audio/VoiceEnrollment';
import { CalibrationButton } from '@/components/lumora/audio/CalibrationButton';
import { useAudioDevices } from '@/components/lumora/audio/hooks/useAudioDevices';
import { useInterviewStore } from '@/stores/interview-store';

interface LumoraSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORMS = [
  { value: 'general', label: 'General' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'hackerrank', label: 'HackerRank' },
  { value: 'coderpad', label: 'CoderPad' },
  { value: 'codility', label: 'Codility' },
];

export function LumoraSettings({ isOpen, onClose }: LumoraSettingsProps) {
  const [platform, setPlatform] = useState('general');
  const { voiceMode, setVoiceMode, setAutoEnrollPending, setVoiceFilterEnabled } = useInterviewStore();
  const { selectedDeviceId } = useAudioDevices();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6" onClick={onClose}>
        <div
          className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl"
          style={{ background: '#ffffff', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 border-b border-slate-200">
            <h2 className="text-xl font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif", color: '#0f172a' }}>
              Settings
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: '#94a3b8' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
            {/* ── Audio Settings ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', sans-serif", color: '#64748b' }}>
                Audio Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Microphone */}
                <SettingCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>}
                  title="Microphone"
                  description="Select your audio input device for recording."
                >
                  <div className="mt-3">
                    <MicrophoneSelector disabled={false} />
                  </div>
                </SettingCard>

                {/* Platform */}
                <SettingCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>}
                  title="Platform"
                  description="Interview platform you're using."
                >
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    className="mt-3 w-full text-sm rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </SettingCard>

                {/* Calibration */}
                <SettingCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 21v-7m0 0V3m0 11h4m12 7v-4m0 0V3m0 14h-4M12 21V11m0 0V3m0 8h4" /></svg>}
                  title="Calibrate"
                  description="Measure ambient noise for better voice detection."
                >
                  <div className="mt-3">
                    <CalibrationButton deviceId={selectedDeviceId} disabled={false} variant="light" />
                  </div>
                </SettingCard>
              </div>
            </section>

            {/* ── Voice Recognition ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: '#64748b' }}>
                Voice Recognition
              </h3>
              <p className="text-xs mb-4" style={{ color: '#64748b' }}>
                Choose how Camora distinguishes your voice from the interviewer.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mode 1: Filter Candidate */}
                <VoiceModeCard
                  active={voiceMode === 'filter-candidate'}
                  onClick={() => setVoiceMode('filter-candidate')}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="4" y1="4" x2="20" y2="20" /></svg>}
                  title="Filter My Voice"
                  description="Record your voice pattern, then filter it out during the interview. Only the interviewer's questions get transcribed and answered."
                  badge="Recommended"
                />

                {/* Mode 2: Record Interviewer */}
                <VoiceModeCard
                  active={voiceMode === 'record-interviewer'}
                  onClick={() => {
                    setVoiceMode('record-interviewer');
                    setAutoEnrollPending(true);
                    setVoiceFilterEnabled(true);
                  }}
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
                  title="Record Interviewer"
                  description="No setup needed. Start the interview and Camora auto-learns your voice from the first recording, then filters it out so only the interviewer is transcribed."
                />
              </div>

              {/* Voice enrollment section based on mode */}
              <div className="mt-4 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                {voiceMode === 'filter-candidate' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cam-primary)' }}>Step 1</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>Enroll your voice (5-second sample)</span>
                    </div>
                    <VoiceEnrollment disabled={false} variant="light" />
                    <p className="text-[10px] mt-2" style={{ color: '#94a3b8' }}>
                      Once enrolled, your voice will be filtered out during recording. Toggle filter on/off anytime from the header.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--cam-primary)' }}>Step 1</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>Enroll your voice (5-second sample)</span>
                    </div>
                    <VoiceEnrollment disabled={false} variant="light" />
                    <p className="text-[10px] mt-2" style={{ color: '#94a3b8' }}>
                      Once enrolled, your voice is filtered out during recording. Only the interviewer's questions are transcribed and answered by AI.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Keyboard Shortcuts ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ fontFamily: "'Inter', sans-serif", color: '#64748b' }}>
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { keys: '⌘M', action: 'Toggle microphone' },
                  { keys: '⌘K', action: 'Focus input' },
                  { keys: '⌘B', action: 'Blank screen' },
                  { keys: '⌘S', action: 'Toggle search' },
                  { keys: '⌘⌫', action: 'Clear history' },
                  { keys: '⌘↵', action: 'Submit' },
                ].map(s => (
                  <div key={s.keys} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <kbd className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontFamily: "'Source Code Pro', monospace" }}>{s.keys}</kbd>
                    <span className="text-xs" style={{ color: '#475569', fontFamily: "'Inter', sans-serif" }}>{s.action}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Setting Card ── */
function SettingCard({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children?: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl transition-all hover:shadow-sm" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#f1f5f9', color: 'var(--cam-primary)' }}>
        {icon}
      </div>
      <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--cam-primary)', fontFamily: "'Inter', sans-serif" }}>{title}</h4>
      <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{description}</p>
      {children}
    </div>
  );
}

/* ── Voice Mode Card ── */
function VoiceModeCard({ active, onClick, icon, title, description, badge, disabled }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string; badge?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="p-5 rounded-xl text-left transition-all relative"
      style={{
        background: active ? 'rgba(236,72,153,0.03)' : '#ffffff',
        border: active ? '2px solid var(--cam-primary)' : '1.5px solid #e2e8f0',
        boxShadow: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: disabled ? '#00000010' : 'rgba(236,72,153,0.08)', color: disabled ? '#000000' : 'var(--cam-primary)' }}>
          {badge}
        </span>
      )}
      {/* Radio indicator */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: active ? 'var(--cam-primary)' : '#cbd5e1' }}>
          {active && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cam-primary)' }} />}
        </div>
        <div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: active ? 'rgba(236,72,153,0.08)' : '#f1f5f9', color: active ? 'var(--cam-primary)' : '#94a3b8' }}>
            {icon}
          </div>
          <h4 className="text-sm font-bold mb-1" style={{ color: '#0f172a', fontFamily: "'Inter', sans-serif" }}>{title}</h4>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{description}</p>
        </div>
      </div>
    </button>
  );
}
