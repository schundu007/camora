import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { k8sPathApi } from '@/services/k8sPath-api';

export default function K8sPathPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [topicDetail, setTopicDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    k8sPathApi.getTopics()
      .then(d => setTopics(d.topics ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openTopic = async (slug) => {
    if (selected === slug) { setSelected(null); setTopicDetail(null); return; }
    setSelected(slug);
    setDetailLoading(true);
    try {
      const d = await k8sPathApi.getTopic(slug);
      setTopicDetail(d);
    } catch {}
    setDetailLoading(false);
  };

  const byModule = topics.reduce((acc, t) => {
    const m = t.module ?? 1;
    (acc[m] = acc[m] || []).push(t);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>⎈</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Kubernetes Learning Path</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Hands-on exercises validated against a live k3s cluster. Start a k8s-single session in Playground, then work through each topic.
        </p>
        <button
          type="button"
          onClick={() => navigate('/playground?env=k8s-single')}
          style={{ marginTop: 12, padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--cam-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Open Playground →
        </button>
      </div>

      {loading && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading curriculum…</p>}
      {error && <p style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</p>}

      {Object.entries(byModule).map(([mod, list]) => (
        <div key={mod} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'color-mix(in oklab, var(--cam-primary) 70%, transparent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Module {mod}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map(topic => {
              const pct = topic.exercise_count > 0 ? Math.round((topic.completed_count / topic.exercise_count) * 100) : 0;
              const done = topic.completed_count >= topic.exercise_count && topic.exercise_count > 0;
              const open = selected === topic.slug;
              return (
                <div key={topic.slug}>
                  <button
                    type="button"
                    onClick={() => openTopic(topic.slug)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: open ? '8px 8px 0 0' : 8,
                      background: open ? 'var(--bg-elevated)' : 'var(--bg-base)',
                      border: `1px solid ${open ? 'var(--cam-primary)' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{done ? '✅' : '⬜'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{topic.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.summary}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: done ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {topic.completed_count}/{topic.exercise_count}
                      </div>
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--border)', marginTop: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: done ? 'var(--success)' : 'var(--cam-primary)', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                  </button>

                  {open && (
                    <div style={{ border: '1px solid var(--cam-primary)', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'var(--bg-elevated)', padding: '12px 16px' }}>
                      {detailLoading && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Loading exercises…</p>}
                      {!detailLoading && topicDetail?.exercises?.map((ex, i) => (
                        <div key={ex.id} style={{
                          padding: '10px 12px', borderRadius: 6, marginBottom: 6,
                          background: ex.completed ? 'rgba(43,181,52,0.08)' : 'var(--bg-base)',
                          border: `1px solid ${ex.completed ? 'rgba(43,181,52,0.25)' : 'var(--border)'}`,
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                        }}>
                          <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{ex.completed ? '✅' : `${i + 1}.`}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ex.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{ex.prompt}</div>
                            {ex.hint && (
                              <div style={{ fontSize: 12, color: 'color-mix(in oklab, var(--cam-primary) 80%, transparent)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                                Hint: {ex.hint}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
