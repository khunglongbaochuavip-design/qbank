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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
        setRemaining((res.attempt as Record<string, unknown>).authoritativeRemainingSeconds as number);
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

  const saveAnswer = useCallback((questionId: string, selectedOption: string, ts: number) => {
    const run = (async () => {
      for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
        if (RETRY_DELAYS_MS[i]) await sleep(RETRY_DELAYS_MS[i]);
        // A newer click for this question exists — let that request handle saving
        if (latestRef.current[questionId]?.ts !== ts || finishedRef.current) return;
        try {
          await api.put(`/sessions/${sessionId}/answer`, { questionId, selectedOption, clientTs: ts });
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
      for (let i = 0; i < 3; i++) {
        try {
          await api.post(`/sessions/${sessionId}/submit`, { autoSubmit, answers: finalAnswers });
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
    const errCount = Object.values(saveState).filter(s => s === 'error').length;
    Modal.confirm({
      title: 'Xác nhận nộp bài?',
      content: (
        <div>
          <div>Bạn đã trả lời {Object.keys(answers).length}/{total} câu hỏi.</div>
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result status="success" title="Đã nộp bài!" subTitle="Bài thi của bạn đã được ghi nhận."
          extra={<Button type="primary" onClick={() => router.push('/my-results')}>Xem kết quả</Button>} />
      </div>
    );
  }

  if (collected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result status="info" title="Bài thi đã được thu"
          subTitle="Phiên thi đã kết thúc hoặc bài làm đã được nộp. Các câu trả lời đã lưu trước đó vẫn được ghi nhận."
          extra={<Button type="primary" onClick={() => router.push('/my-results')}>Xem kết quả</Button>} />
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

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh' }}>
      <div className="exam-container">
        <div className="exam-header">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{session?.name as string}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Thời lượng: {session?.durationMinutes as number} phút · {questions.length} câu hỏi</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {errorCount > 0 ? (
                <span style={{ color: '#fecaca', fontWeight: 600 }}>
                  ⚠ {errorCount} câu chưa lưu được{' '}
                  <Button size="small" danger onClick={retryFailed} style={{ marginLeft: 6 }}>Lưu lại</Button>
                </span>
              ) : savingCount > 0 ? (
                <span style={{ opacity: 0.85 }}>Đang lưu…</span>
              ) : (
                <span style={{ opacity: 0.85 }}>✓ Đã lưu tất cả câu trả lời</span>
              )}
            </div>
          </div>
          <div className={`exam-timer ${timerClass}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {questions.map((q) => (
          <div key={q.id as string} className="question-card">
            <div className="question-number">{q.displayOrder as number}</div>
            {saveState[q.id as string] === 'error' && (
              <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 6 }}>⚠ Câu này chưa lưu được lên máy chủ — hệ thống đang thử lại / sẽ gửi khi nộp bài.</div>
            )}
            {(q.contextText as string) && (
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 12, color: '#475569', fontSize: 13, fontStyle: 'italic' }}>
                <MathRenderer content={q.contextText as string} />
              </div>
            )}
            <MathRenderer className="question-text" content={q.questionText as string} style={{ marginBottom: 12, fontWeight: 500 }} />
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
            <Radio.Group value={answers[q.id as string]} onChange={e => onSelectOption(q.id as string, e.target.value)} style={{ width: '100%' }}>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt} style={{
                  padding: '12px 16px', marginBottom: 8, borderRadius: 10,
                  border: answers[q.id as string] === opt ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: answers[q.id as string] === opt ? '#eff6ff' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <Radio value={opt}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                      <strong>{opt}.</strong>
                      <MathRenderer content={q[`option${opt}`] as string} style={{ display: 'inline-block' }} />
                    </div>
                  </Radio>
                </div>
              ))}
            </Radio.Group>
          </div>
        ))}

        <div style={{ textAlign: 'center', padding: '24px 0 48px' }}>
          <Button type="primary" size="large" onClick={onSubmit} loading={submitting}
            style={{ height: 52, paddingInline: 48, borderRadius: 14, fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            📋 Nộp bài
          </Button>
        </div>

        <div className="question-nav">
          {questions.map((q, i) => (
            <button key={q.id as string} className={`question-nav-btn ${answers[q.id as string] ? 'answered' : ''}`}
              style={saveState[q.id as string] === 'error' ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' } : undefined}
              title={saveState[q.id as string] === 'error' ? 'Chưa lưu được' : undefined}
              onClick={() => document.querySelectorAll('.question-card')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              {q.displayOrder as number}
            </button>
          ))}
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
