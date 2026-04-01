// src/pages/take-exam/TakeExamPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, Progress, Space, Typography, Spin, Alert, Result, Tag, Modal } from 'antd';
import { CheckOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

const { Title, Text } = Typography;
const OPTIONS = ['A', 'B', 'C', 'D'];
const OPT_COLORS = { A: '#3b82f6', B: '#10b981', C: '#f59e0b', D: '#ef4444' };

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TakeExamPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examData, setExamData] = useState(null); // { attempt, session, questions }
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  const timerRef = useRef(null);
  const answersRef = useRef({});
  answersRef.current = answers;

  const autoSubmit = useCallback(async () => {
    if (submitted) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/sessions/${sessionId}/submit`);
      setResult(res.data);
      setSubmitted(true);
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  }, [sessionId, submitted]);

  useEffect(() => {
    api.post(`/sessions/${sessionId}/start-attempt`)
      .then(res => {
        setExamData(res.data);
        // Pre-fill existing answers
        const existing = {};
        res.data.attempt.responses?.forEach(r => { existing[r.questionId] = r.selectedOption; });
        setAnswers(existing);
        // Set timer
        const durationSec = (res.data.session.durationMinutes || 60) * 60;
        if (res.data.attempt.startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(res.data.attempt.startedAt).getTime()) / 1000);
          const remaining = Math.max(0, durationSec - elapsed);
          setTimeLeft(remaining);
          if (remaining <= 0) { autoSubmit(); }
        } else {
          setTimeLeft(durationSec);
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Không thể bắt đầu bài thi.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { autoSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted]);

  const handleAnswer = async (questionId, option) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    try {
      await api.put(`/sessions/${sessionId}/answer`, { questionId, selectedOption: option });
    } catch { /* silently fail — will be saved on submit */ }
  };

  const handleSubmit = async () => {
    setConfirmModal(false);
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${sessionId}/submit`);
      setResult(res.data);
      setSubmitted(true);
      clearTimeout(timerRef.current);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi nộp bài.');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <Spin size="large" tip="Đang tải đề thi..." />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <Result status="error" title="Không thể vào bài thi" subTitle={error} extra={<Button onClick={() => navigate('/my-exams')}>Quay lại</Button>} />
    </div>
  );

  if (submitted && result) {
    const percentage = result.score ? (result.score / 10 * 100).toFixed(0) : 0;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: 24 }}>
        <Card style={{ maxWidth: 500, width: '100%', textAlign: 'center', borderRadius: 20 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {result.score >= 8 ? '🎉' : result.score >= 5 ? '👍' : '📚'}
          </div>
          <Title level={2} style={{ color: '#0f172a' }}>Bài thi đã được nộp!</Title>
          <div style={{ margin: '24px 0' }}>
            <Progress
              type="circle"
              percent={parseFloat(percentage)}
              size={140}
              strokeColor={result.score >= 8 ? '#22c55e' : result.score >= 5 ? '#f59e0b' : '#ef4444'}
              format={() => <span style={{ fontSize: 28, fontWeight: 700 }}>{result.score?.toFixed(1)}</span>}
            />
          </div>
          <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Text style={{ color: '#64748b' }}>Số câu đúng</Text>
              <Text strong style={{ color: '#22c55e' }}>{result.numCorrect} câu</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Text style={{ color: '#64748b' }}>Số câu sai</Text>
              <Text strong style={{ color: '#ef4444' }}>{result.numWrong} câu</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <Text style={{ color: '#64748b' }}>Điểm số</Text>
              <Text strong style={{ color: '#3b82f6', fontSize: 20 }}>{result.score?.toFixed(2)} / 10</Text>
            </div>
          </Space>
          <Button type="primary" size="large" block onClick={() => navigate('/my-results')}>
            Xem kết quả chi tiết
          </Button>
        </Card>
      </div>
    );
  }

  const { questions, session } = examData;
  const currentQuestion = questions[currentQ];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isWarning = timeLeft !== null && timeLeft <= 300;
  const isDanger = timeLeft !== null && timeLeft <= 60;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f2f5', overflow: 'hidden' }}>
      {/* Main exam area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 100px' }}>
        {/* Question */}
        {currentQuestion && (
          <Card bordered={false} style={{ borderRadius: 16, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>Câu {currentQ + 1} / {questions.length}</Tag>
              {currentQuestion.questionCode && <Text style={{ color: '#94a3b8', fontSize: 12 }}>{currentQuestion.questionCode}</Text>}
            </div>

            {currentQuestion.contextText && (
              <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid #3b82f6' }}>
                <Text style={{ color: '#475569' }}>{currentQuestion.contextText}</Text>
              </div>
            )}

            {currentQuestion.questionImage && (
              <img src={currentQuestion.questionImage} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }} />
            )}

            <Title level={5} style={{ marginBottom: 24, color: '#0f172a', lineHeight: 1.6 }}>
              {currentQuestion.questionText}
            </Title>

            <div>
              {OPTIONS.map(opt => {
                const isSelected = answers[currentQuestion.id] === opt;
                return (
                  <div
                    key={opt}
                    className={`question-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswer(currentQuestion.id, opt)}
                  >
                    <div className="option-label" style={isSelected ? { background: OPT_COLORS[opt], color: '#fff' } : {}}>
                      {opt}
                    </div>
                    <Text>{currentQuestion[`option${opt}`]}</Text>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Button size="large" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
                ← Câu trước
              </Button>
              <Button size="large" type="primary" onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))} disabled={currentQ === questions.length - 1}>
                Câu sau →
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Right panel */}
      <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', padding: 20, gap: 20, overflow: 'auto' }}>
        {/* Timer */}
        <div style={{ textAlign: 'center', background: isDanger ? '#fff1f0' : isWarning ? '#fffbeb' : '#f0fdf4', borderRadius: 12, padding: '16px 0' }}>
          <ClockCircleOutlined style={{ fontSize: 20, color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e', marginBottom: 4 }} />
          <div className={`exam-timer ${isDanger ? 'danger' : isWarning ? 'warning' : ''}`} style={{ color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e' }}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Thời gian còn lại</div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Tiến độ</Text>
            <Text style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>{answeredCount}/{questions.length}</Text>
          </div>
          <Progress percent={parseFloat(progress.toFixed(0))} strokeColor="#3b82f6" size="small" showInfo={false} />
        </div>

        {/* Question palette */}
        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 10 }}>Bảng câu hỏi</Text>
          <div className="q-palette">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={`q-dot ${answers[q.id] ? 'answered' : ''} ${idx === currentQ ? 'current' : ''}`}
                onClick={() => setCurrentQ(idx)}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#1677ff', marginRight: 4 }} />Đã chọn</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#e8e8e8', marginRight: 4 }} />Chưa chọn</span>
        </div>

        {/* Submit */}
        <Button
          type="primary"
          size="large"
          block
          icon={<CheckOutlined />}
          onClick={() => setConfirmModal(true)}
          loading={submitting}
          style={{ height: 48, borderRadius: 10, fontWeight: 700 }}
        >
          Nộp bài
        </Button>
      </div>

      {/* Submit confirm modal */}
      <Modal
        open={confirmModal}
        title={<span><WarningOutlined style={{ color: '#f59e0b', marginRight: 8 }} />Xác nhận nộp bài</span>}
        onCancel={() => setConfirmModal(false)}
        onOk={handleSubmit}
        okText="Nộp bài"
        cancelText="Tiếp tục làm"
        okButtonProps={{ loading: submitting }}
      >
        <Text>Bạn đã trả lời <strong>{answeredCount}/{questions.length}</strong> câu hỏi.</Text>
        {answeredCount < questions.length && (
          <Alert
            message={`Còn ${questions.length - answeredCount} câu chưa được trả lời. Bạn có chắc muốn nộp bài không?`}
            type="warning"
            showIcon
            style={{ marginTop: 12, borderRadius: 8 }}
          />
        )}
      </Modal>
    </div>
  );
}
