'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Radio, Spin, message, Modal, Result, ConfigProvider } from 'antd';
import { api } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import { AuthProvider } from '@/components/providers/AuthProvider';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { ssr: false });

type SaveState = 'saving' | 'saved' | 'error';
const RETRY_DELAYS_MS = [0, 800, 2000, 4000];
const STATUS_POLL_MS = 30000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function TakeExamInner() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [remaining, setRemaining] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [collected, setCollected] = useState(false); // session ended / attempt closed by the server
  const [submitting, setSubmitting] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [awayCount, setAwayCount] = useState(0);
  const [awayTotalSeconds, setAwayTotalSeconds] = useState(0);
  const [lastAwaySeconds, setLastAwaySeconds] = useState(0);
  const [awayWarningOpen, setAwayWarningOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const awayStartRef = useRef<number | null>(null);
  const awayRef = useRef<{ count: number; total: number }>({ count: 0, total: 0 });

  // Latest choice per question with a strictly increasing click timestamp (newer always wins on the server)
  const latestRef = useRef<Record<string, { opt: string; ts: number }>>({});
  const lastTsRef = useRef(0);
  const pendingRef = useRef<Set<Promise<void>>>(new Set());
  const finishedRef = useRef(false);

  const nextTs = () => {
    const ts = Math.max(Date.now(), lastTsRef.current + 1);
    lastTsRef.current = ts;
    return ts;
  };

  const markFinished = useCallback((kind: 'submitted' | 'collected') => {
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (kind === 'submitted') setSubmitted(true); else setCollected(true);
  }, []);

  /** Ask the server whether this attempt is still open. Returns true if closed. */
  const checkClosed = useCallback(async (): Promise<boolean> => {
    try {
      const st = await api.get<{ sessionStatus: string; attemptStatus: string | null }>(`/sessions/${sessionId}/status`);
      if (st.sessionStatus === 'ended' || (st.attemptStatus && st.attemptStatus !== 'in_progress')) {
        if (!finishedRef.current) markFinished('collected');
        return true;
      }
    } catch { /* network issue — not proof of closure */ }
    return false;
  }, [sessionId, markFinished]);

  useEffect(() => {
    if (!sessionId) return;
    api.post(`/sessions/${sessionId}/start-attempt`)
      .then((d: unknown) => {
        const res = d as Record<string, unknown>;
        setData(res);
        const att = res.attempt as Record<string, unknown>;
        setRemaining(att.authoritativeRemainingSeconds as number);
        const initCount = Number(att.awayCount || 0);
        const initSec = Number(att.awayTotalSeconds || 0);
        awayRef.current = { count: initCount, total: initSec };
        setAwayCount(initCount);
        setAwayTotalSeconds(initSec);
        const questions = res.questions as Record<string, unknown>[];
        const saved: Record<string, string> = {};
        const states: Record<string, SaveState> = {};
        questions.forEach(q => {
          if (q.selectedOption) {
            saved[q.id as string] = q.selectedOption as string;
            states[q.id as string] = 'saved';
            // ts 0: already stored on the server, never overrides a newer stored value
            latestRef.current[q.id as string] = { opt: q.selectedOption as string, ts: 0 };
          }
        });
        setAnswers(saved);
        setSaveState(states);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Periodically detect that the officer ended the session
  useEffect(() => {
    if (!data || submitted || collected) return;
    const t = setInterval(() => { if (!finishedRef.current) checkClosed(); }, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [data, submitted, collected, checkClosed]);

  // Warn before leaving while answers are not yet saved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      const unsaved = Object.values(saveState).some(s => s !== 'saved');
      if (unsaved) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  // Track when the student leaves the exam screen (switches app, switches tab, locks screen, loses focus)
  useEffect(() => {
    if (!data || submitted || collected) return;

    const handleLeave = () => {
      if (finishedRef.current) return;
      if (awayStartRef.current === null) {
        awayStartRef.current = Date.now();
      }
    };

    const handleReturn = () => {
      if (finishedRef.current) return;
      if (document.hidden) return;
      if (awayStartRef.current === null) return;
      const deltaSec = Math.round((Date.now() - awayStartRef.current) / 1000);
      awayStartRef.current = null;
      // Ignore sub-second focus blips (e.g. mobile browser address bar animation)
      if (deltaSec < 1) return;

      const nextCount = awayRef.current.count + 1;
      const nextTotal = awayRef.current.total + deltaSec;
      awayRef.current = { count: nextCount, total: nextTotal };
      setAwayCount(nextCount);
      setAwayTotalSeconds(nextTotal);
      setLastAwaySeconds(deltaSec);
      setAwayWarningOpen(true);

      api.post(`/sessions/${sessionId}/status`, {
        awayCount: nextCount,
        awayTotalSeconds: nextTotal,
        lastAwaySeconds: deltaSec,
      }).catch(() => { /* synced again on next answer/submit */ });
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleLeave();
      else handleReturn();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleReturn);
    };
  }, [data, submitted, collected, sessionId]);

  const saveAnswer = useCallback((questionId: string, selectedOption: string, ts: number) => {
    const run = (async () => {
      for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
        if (RETRY_DELAYS_MS[i]) await sleep(RETRY_DELAYS_MS[i]);
        // A newer click for this question exists — let that request handle saving
        if (latestRef.current[questionId]?.ts !== ts || finishedRef.current) return;
        try {
          await api.put(`/sessions/${sessionId}/answer`, {
            questionId,
            selectedOption,
            clientTs: ts,
            awayCount: awayRef.current.count,
            awayTotalSeconds: awayRef.current.total,
          });
          if (latestRef.current[questionId]?.ts === ts) {
            setSaveState(prev => ({ ...prev, [questionId]: 'saved' }));
          }
          return;
        } catch (err) {
          console.error('Save failed:', err);
          // If the server closed the attempt, stop retrying and show the collected screen
          if (await checkClosed()) return;
        }
      }
      if (latestRef.current[questionId]?.ts === ts) {
        setSaveState(prev => ({ ...prev, [questionId]: 'error' }));
      }
    })();
    pendingRef.current.add(run);
    run.finally(() => pendingRef.current.delete(run));
  }, [sessionId, checkClosed]);

  const onSelectOption = (questionId: string, option: string) => {
    if (finishedRef.current) return;
    const ts = nextTs();
    latestRef.current[questionId] = { opt: option, ts };
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    setSaveState(prev => ({ ...prev, [questionId]: 'saving' }));
    saveAnswer(questionId, option, ts);
  };

  const retryFailed = () => {
    Object.entries(saveState).forEach(([qid, st]) => {
      if (st === 'error' && latestRef.current[qid]) {
        const ts = nextTs();
        latestRef.current[qid] = { ...latestRef.current[qid], ts };
        setSaveState(prev => ({ ...prev, [qid]: 'saving' }));
        saveAnswer(qid, latestRef.current[qid].opt, ts);
      }
    });
  };

  /** Wait for in-flight saves, then submit together with ALL current answers (final sync on the server). */
  const doSubmit = useCallback(async (autoSubmit: boolean) => {
    if (finishedRef.current) return;
    setSubmitting(true);
    try {
      await Promise.race([Promise.allSettled([...pendingRef.current]), sleep(8000)]);
      const finalAnswers = Object.entries(latestRef.current).map(([questionId, v]) => ({
        questionId, selectedOption: v.opt, clientTs: v.ts,
      }));
      if (awayStartRef.current !== null) {
        const extraSec = Math.round((Date.now() - awayStartRef.current) / 1000);
        awayStartRef.current = null;
        if (extraSec >= 1) {
          awayRef.current = {
            count: awayRef.current.count + 1,
            total: awayRef.current.total + extraSec,
          };
        }
      }
      for (let i = 0; i < 3; i++) {
        try {
          await api.post(`/sessions/${sessionId}/submit`, {
            autoSubmit,
            answers: finalAnswers,
            awayCount: awayRef.current.count,
            awayTotalSeconds: awayRef.current.total,
          });
          markFinished('submitted');
          if (autoSubmit) message.warning('Hết giờ! Bài thi đã được tự động nộp.');
          else message.success('Đã nộp bài thành công!');
          return;
        } catch (err) {
          if (await checkClosed()) return;
          if (i === 2) {
            message.error(`Nộp bài chưa thành công: ${(err as Error).message}. Hãy kiểm tra mạng và bấm Nộp bài lại.`);
          } else {
            await sleep(1500);
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, markFinished, checkClosed]);

  const doSubmitRef = useRef(doSubmit);
  useEffect(() => { doSubmitRef.current = doSubmit; }, [doSubmit]);

  // Countdown timer
  useEffect(() => {
    if (remaining <= 0 || submitted || collected) return;
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); doSubmitRef.current(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining > 0 && !submitted && !collected]);

  const onSubmit = () => {
    const total = (data?.questions as unknown[])?.length || 0;
    const answeredCount = Object.keys(answers).length;
    const unanswered = total - answeredCount;
    const errCount = Object.values(saveState).filter(s => s === 'error').length;
    Modal.confirm({
      centered: true,
      title: 'Xác nhận nộp bài?',
      content: (
        <div>
          <div>Bạn đã trả lời <strong>{answeredCount}/{total}</strong> câu hỏi.</div>
          {unanswered > 0 && <div style={{ color: '#d97706', marginTop: 4 }}>Còn {unanswered} câu chưa chọn đáp án.</div>}
          {errCount > 0 && <div style={{ color: '#dc2626', marginTop: 6 }}>Có {errCount} câu chưa lưu được — hệ thống sẽ gửi lại cùng lúc nộp bài.</div>}
        </div>
      ),
      okText: 'Nộp bài', cancelText: 'Tiếp tục làm',
      onOk: () => doSubmit(false),
    });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Đang tải đề thi..." /></div>;
  if (error) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Result status="error" title="Lỗi" subTitle={error} extra={<Button onClick={() => router.push('/my-exams')}>Quay lại</Button>} /></div>;

  if (submitted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 16 }}>
        <Result status="success" title="Đã nộp bài!" subTitle="Bài thi của bạn đã được ghi nhận."
          extra={<Button type="primary" size="large" onClick={() => router.push('/my-results')}>Xem kết quả</Button>} />
      </div>
    );
  }

  if (collected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 16 }}>
        <Result status="info" title="Bài thi đã được thu"
          subTitle="Phiên thi đã kết thúc hoặc bài làm đã được nộp. Các câu trả lời đã lưu trước đó vẫn được ghi nhận."
          extra={<Button type="primary" size="large" onClick={() => router.push('/my-results')}>Xem kết quả</Button>} />
      </div>
    );
  }

  const session = data?.session as Record<string, unknown>;
  const questions = (data?.questions as Record<string, unknown>[]) || [];
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timerClass = remaining < 60 ? 'danger' : remaining < 300 ? 'warning' : '';
  const savingCount = Object.values(saveState).filter(s => s === 'saving').length;
  const errorCount = Object.values(saveState).filter(s => s === 'error').length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', paddingBottom: 80 }}>
      <div className="exam-container">
        {/* Sticky Top Exam Header */}
        <div className="exam-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="exam-header-title">{session?.name as string}</div>
            <div className="exam-header-meta">
              Đã làm: <strong>{answeredCount}/{questions.length}</strong> câu ·{' '}
              {errorCount > 0 ? (
                <span style={{ color: '#fecaca', fontWeight: 600 }}>
                  ⚠ {errorCount} câu lỗi{' '}
                  <Button size="small" danger onClick={retryFailed} style={{ marginLeft: 4 }}>Lưu lại</Button>
                </span>
              ) : savingCount > 0 ? (
                <span>Đang lưu…</span>
              ) : (
                <span>✓ Đã lưu</span>
              )}
              {awayCount > 0 && (
                <span style={{ color: '#fde047', fontWeight: 600, marginLeft: 6 }}>
                  · 👁️ Thoát màn hình: {awayCount} lần ({awayTotalSeconds}s)
                </span>
              )}
            </div>
          </div>
          <div className={`exam-timer ${timerClass}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Away-screen Warning Modal */}
        <Modal
          open={awayWarningOpen}
          centered
          closable={false}
          maskClosable={false}
          title={<span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ Cảnh báo rời khỏi màn hình thi</span>}
          footer={[
            <Button
              key="ok"
              type="primary"
              danger
              size="large"
              style={{ width: '100%', fontWeight: 700, borderRadius: 10 }}
              onClick={() => setAwayWarningOpen(false)}
            >
              Tôi đã hiểu và quay lại làm bài
            </Button>,
          ]}
        >
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#1e293b' }}>
            <p style={{ marginBottom: 8 }}>
              Hệ thống phát hiện bạn vừa rời khỏi giao diện bài thi (chuyển ứng dụng, chuyển tab hoặc tắt màn hình) trong{' '}
              <strong style={{ color: '#dc2626', fontSize: 16 }}>{lastAwaySeconds} giây</strong>.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <div>• Số lần rời màn hình: <strong style={{ color: '#dc2626' }}>{awayCount} lần</strong></div>
              <div>• Tổng thời gian rời màn hình: <strong style={{ color: '#dc2626' }}>{awayTotalSeconds} giây</strong></div>
            </div>
            <p style={{ marginBottom: 0, fontSize: 13, color: '#64748b' }}>
              Toàn bộ số lần và thời gian thoát màn hình đã được hệ thống ghi nhận tự động vào kết quả bài thi để giám thị kiểm tra tính trung thực.
            </p>
          </div>
        </Modal>

        {/* Question Cards */}
        {questions.map((q) => {
          const qId = q.id as string;
          const selected = answers[qId];
          return (
            <div key={qId} className="question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="question-number" style={{ marginBottom: 0 }}>Câu {q.displayOrder as number}</div>
                {selected && <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Đã chọn: {selected}</span>}
              </div>
              {saveState[qId] === 'error' && (
                <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>
                  ⚠ Câu này chưa lưu được lên máy chủ — hệ thống đang thử lại / sẽ gửi khi nộp bài.
                </div>
              )}
              {(q.contextText as string) && (
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 12, color: '#475569', fontSize: 13, fontStyle: 'italic' }}>
                  <MathRenderer content={q.contextText as string} />
                </div>
              )}
              <MathRenderer className="question-text" content={q.questionText as string} style={{ marginBottom: 14, fontWeight: 500 }} />
              {(q.questionImage as string) && (
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.questionImage as string}
                    alt="Hình ảnh câu hỏi"
                    style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'contain' }}
                  />
                </div>
              )}
              <div role="radiogroup" aria-label={`Câu ${q.displayOrder as number}`}>
                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                  const isChecked = selected === opt;
                  return (
                    <div
                      key={opt}
                      onClick={() => onSelectOption(qId, opt)}
                      className={`exam-option-row ${isChecked ? 'selected' : ''}`}
                    >
                      <Radio checked={isChecked} value={opt} style={{ marginRight: 0, flexShrink: 0 }} />
                      <strong style={{ flexShrink: 0, minWidth: 20, color: isChecked ? '#1d4ed8' : '#1e293b' }}>{opt}.</strong>
                      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                        <MathRenderer content={q[`option${opt}`] as string} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
          <Button type="primary" size="large" onClick={onSubmit} loading={submitting}
            style={{ height: 52, paddingInline: 48, borderRadius: 14, fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            📋 Nộp bài ({answeredCount}/{questions.length} câu)
          </Button>
        </div>

        {/* Bottom Dock & Collapsible Question Map (never blocks questions on phone screens) */}
        {navOpen && (
          <div
            onClick={() => setNavOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 95 }}
          />
        )}
        <div className="exam-bottom-dock">
          {navOpen && (
            <div className="question-nav-sheet">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>
                  Danh sách câu hỏi ({answeredCount}/{questions.length} đã chọn)
                </strong>
                <Button size="small" type="text" onClick={() => setNavOpen(false)}>Đóng ✕</Button>
              </div>
              <div className="question-nav-grid">
                {questions.map((q, i) => {
                  const qId = q.id as string;
                  const hasErr = saveState[qId] === 'error';
                  return (
                    <button
                      key={qId}
                      type="button"
                      className={`question-nav-btn ${answers[qId] ? 'answered' : ''}`}
                      style={hasErr ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' } : undefined}
                      title={hasErr ? 'Chưa lưu được' : undefined}
                      onClick={() => {
                        setNavOpen(false);
                        document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      {q.displayOrder as number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="exam-dock-bar">
            <Button
              size="large"
              onClick={() => setNavOpen(v => !v)}
              style={{ flex: 1, height: 44, borderRadius: 10, fontWeight: 600 }}
            >
              🔢 Câu hỏi ({answeredCount}/{questions.length}) {navOpen ? '▼' : '▲'}
            </Button>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={onSubmit}
              style={{
                height: 44,
                paddingInline: 20,
                borderRadius: 10,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              }}
            >
              📋 Nộp bài
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TakeExamPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#3b82f6', borderRadius: 10, fontFamily: 'Inter, sans-serif' } }}>
      <AuthProvider><TakeExamInner /></AuthProvider>
    </ConfigProvider>
  );
}
