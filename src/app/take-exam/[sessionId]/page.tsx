'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Radio, Spin, message, Modal, Result, ConfigProvider } from 'antd';
import { api } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import { AuthProvider } from '@/components/providers/AuthProvider';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { ssr: false });

function TakeExamInner() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    api.post(`/sessions/${sessionId}/start-attempt`)
      .then((d: unknown) => {
        const res = d as Record<string, unknown>;
        setData(res);
        setRemaining((res.attempt as Record<string, unknown>).authoritativeRemainingSeconds as number);
        const questions = res.questions as Record<string, unknown>[];
        const saved: Record<string, string> = {};
        questions.forEach(q => { if (q.selectedOption) saved[q.id as string] = q.selectedOption as string; });
        setAnswers(saved);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (remaining <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); onAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [remaining > 0 && !submitted]);

  const saveAnswer = useCallback(async (questionId: string, selectedOption: string) => {
    try {
      await api.put(`/sessions/${sessionId}/answer`, { questionId, selectedOption });
    } catch (err) { console.error('Save failed:', err); }
  }, [sessionId]);

  const onSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    saveAnswer(questionId, option);
  };

  const onSubmit = () => {
    Modal.confirm({
      title: 'Xác nhận nộp bài?',
      content: `Bạn đã trả lời ${Object.keys(answers).length}/${(data?.questions as unknown[])?.length || 0} câu hỏi.`,
      okText: 'Nộp bài', cancelText: 'Tiếp tục làm',
      onOk: async () => {
        try {
          await api.post(`/sessions/${sessionId}/submit`, {});
          setSubmitted(true);
          message.success('Đã nộp bài thành công!');
        } catch (err: unknown) { message.error((err as Error).message); }
      },
    });
  };

  const onAutoSubmit = async () => {
    try {
      await api.post(`/sessions/${sessionId}/submit`, { autoSubmit: true });
      setSubmitted(true);
      message.warning('Hết giờ! Bài thi đã được tự động nộp.');
    } catch (err) { console.error(err); }
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

  const session = data?.session as Record<string, unknown>;
  const questions = (data?.questions as Record<string, unknown>[]) || [];
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timerClass = remaining < 60 ? 'danger' : remaining < 300 ? 'warning' : '';

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh' }}>
      <div className="exam-container">
        <div className="exam-header">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{session?.name as string}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Thời lượng: {session?.durationMinutes as number} phút · {questions.length} câu hỏi</div>
          </div>
          <div className={`exam-timer ${timerClass}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {questions.map((q, i) => (
          <div key={q.id as string} className="question-card">
            <div className="question-number">{q.displayOrder as number}</div>
            {(q.contextText as string) && (
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 12, color: '#475569', fontSize: 13, fontStyle: 'italic' }}>
                <MathRenderer content={q.contextText as string} />
              </div>
            )}
            <MathRenderer className="question-text" content={q.questionText as string} style={{ marginBottom: 12, fontWeight: 500 }} />
            <Radio.Group value={answers[q.id as string]} onChange={e => onSelectOption(q.id as string, e.target.value)} style={{ width: '100%' }}>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt} style={{
                  padding: '12px 16px', marginBottom: 8, borderRadius: 10,
                  border: answers[q.id as string] === opt ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: answers[q.id as string] === opt ? '#eff6ff' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }} onClick={() => onSelectOption(q.id as string, opt)}>
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
          <Button type="primary" size="large" onClick={onSubmit}
            style={{ height: 52, paddingInline: 48, borderRadius: 14, fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            📋 Nộp bài
          </Button>
        </div>

        <div className="question-nav">
          {questions.map((q, i) => (
            <button key={q.id as string} className={`question-nav-btn ${answers[q.id as string] ? 'answered' : ''}`}
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
