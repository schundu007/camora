/* ── ScaleCalculator — interactive sliders for design baseline inputs
   Sliders for DAU, RPS, payload, retention with derived values
   (QPS avg/peak, read QPS, daily bandwidth, storage) recomputed
   client-side from the model's baseline inputs.
*/
import { useState } from 'react';
import { humanizeNumber, humanizeBytes, type DesignTheme } from './theme';
import type { SystemDesign } from './parsers';

export function ScaleCalculator({ baseline, themeTokens }: {
  baseline: NonNullable<SystemDesign['scaleInputs']>;
  themeTokens: DesignTheme;
}) {
  const [inputs, setInputs] = useState({
    DAU: baseline.DAU ?? 1_000_000,
    RequestsPerUser: baseline.RequestsPerUser ?? 10,
    PayloadBytes: baseline.PayloadBytes ?? 1200,
    RetentionDays: baseline.RetentionDays ?? 90,
    PeakMultiplier: baseline.PeakMultiplier ?? 3,
    ReadWriteRatio: baseline.ReadWriteRatio ?? 20,
  });

  const totalRequestsPerDay = inputs.DAU * inputs.RequestsPerUser;
  const avgQPS = totalRequestsPerDay / 86400;
  const peakQPS = avgQPS * inputs.PeakMultiplier;
  const readQPS = peakQPS * (inputs.ReadWriteRatio / (inputs.ReadWriteRatio + 1));
  const writeQPS = peakQPS - readQPS;
  const dailyBandwidth = totalRequestsPerDay * inputs.PayloadBytes;
  const storage = totalRequestsPerDay * inputs.PayloadBytes * inputs.RetentionDays;

  const sliders: { key: keyof typeof inputs; label: string; min: number; max: number; step: number; display: (v: number) => string }[] = [
    { key: 'DAU', label: 'Daily Active Users', min: 1000, max: inputs.DAU * 20, step: Math.max(1000, Math.floor(inputs.DAU / 100)), display: humanizeNumber },
    { key: 'RequestsPerUser', label: 'Requests / user / day', min: 1, max: Math.max(200, inputs.RequestsPerUser * 10), step: 1, display: v => v.toFixed(0) },
    { key: 'PayloadBytes', label: 'Payload size', min: 100, max: Math.max(100_000, inputs.PayloadBytes * 10), step: 100, display: humanizeBytes },
    { key: 'RetentionDays', label: 'Retention (days)', min: 1, max: 3650, step: 1, display: v => v.toFixed(0) },
    { key: 'PeakMultiplier', label: 'Peak-to-avg factor', min: 1, max: 20, step: 0.1, display: v => `${v.toFixed(1)}×` },
    { key: 'ReadWriteRatio', label: 'Read:Write ratio', min: 0.5, max: 200, step: 0.5, display: v => `${v.toFixed(1)}:1` },
  ];

  const derived = [
    { label: 'Avg QPS', value: humanizeNumber(avgQPS) + ' rps' },
    { label: 'Peak QPS', value: humanizeNumber(peakQPS) + ' rps' },
    { label: 'Read QPS', value: humanizeNumber(readQPS) + ' rps' },
    { label: 'Write QPS', value: humanizeNumber(writeQPS) + ' rps' },
    { label: 'Daily bandwidth', value: humanizeBytes(dailyBandwidth) },
    { label: 'Storage over period', value: humanizeBytes(storage) },
  ];

  const t = themeTokens;

  return (
    <div className="px-4 pb-3">
      <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: t.sectionBg, border: `1px solid ${t.cardBorder}` }}>
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.headerText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <polyline points="7 14 12 9 16 13 21 8" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: t.headerText }}>Interactive Calculator</span>
          <span className="ml-auto text-[10px]" style={{ color: t.textMuted }}>Drag sliders — numbers recompute live</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
          {sliders.map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span style={{ color: t.textMuted }}>{s.label}</span>
                <span className="font-mono font-bold" style={{ color: t.text }}>{s.display(inputs[s.key])}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={inputs[s.key]}
                onChange={e => setInputs(i => ({ ...i, [s.key]: Number(e.target.value) }))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--cam-primary) ${((inputs[s.key] - s.min) / (s.max - s.min)) * 100}%, ${t.cardBorder} ${((inputs[s.key] - s.min) / (s.max - s.min)) * 100}%)`, accentColor: 'var(--cam-primary)' }}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1" style={{ borderTop: `1px solid ${t.cardBorder}` }}>
          {derived.map(d => (
            <div key={d.label} className="rounded-lg px-2.5 py-1.5" style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.textDim }}>{d.label}</p>
              <p className="text-[13px] font-mono font-bold" style={{ color: t.headerText }}>{d.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
