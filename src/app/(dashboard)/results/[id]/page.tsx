'use client';
import React, { useEffect, useState } from 'react';
import { Spin, Tag, Card, Divider, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { ssr: false });

export default function AttemptResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) api.get(`/results/${id}`).then(d => setData(d as Record<string, unknown>)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!data) return <Result status="404" title="Không tìm thấy kết quả" />;

  const attempt = data.attempt as Record<string, unknown>;
  const student = data.student as Record<string, unknown>;
  const exam = data.exam as Record<string, unknown>;
  const questions = data.questions as Record<string, unknown>[];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header"><h2>📋 Kết quả bài thi</h2></div>

      <div className="content-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
        <div><div style={{ color: '#64748b', fontSize: 13 }}>Học sinh</div><div style={{ fontWeight: 700, fontSize: 16 }}>{student.fullName as string}</div></div>
        <div><div style={{ color: '#64748b', fontSize: 13 }}>Điểm</div>
          <Tag color={(attempt.score as number) >= 5 ? 'green' : 'red'} style={{ fontSize: 24, fontWeight: 700, padding: '6px 20px' }}>{attempt.score as number}</Tag></div>
        <div><div style={{ color: '#64748b', fontSize: 13 }}>Đúng / Sai</div>
          <div style={{ fontWeight: 700 }}><span style={{ color: '#22c55e' }}>{attempt.numCorrect as number} đúng</span> · <span style={{ color: '#ef4444' }}>{attempt.numWrong as number} sai</span></div></div>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="question-card" style={{ borderLeft: `4px solid ${q.isCorrect ? '#22c55e' : '#ef4444'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="question-number">{q.displayOrder as number}</div>
            {q.isCorrect ? <Tag icon={<CheckCircleOutlined />} color="success">Đúng</Tag> : <Tag icon={<CloseCircleOutlined />} color="error">Sai</Tag>}
          </div>
          <MathRenderer className="question-text" content={q.questionText as string} style={{ marginBottom: 12, fontWeight: 500 }} />
          {['A', 'B', 'C', 'D'].map(opt => {
            const isSelected = q.selectedOption === opt;
            const isCorrect = q.correctOption === opt;
            let bg = 'transparent';
            let border = '1px solid #e2e8f0';
            if (isCorrect) { bg = '#dcfce7'; border = '2px solid #22c55e'; }
            else if (isSelected && !isCorrect) { bg = '#fee2e2'; border = '2px solid #ef4444'; }
            return (
              <div key={opt} style={{ padding: '10px 16px', marginBottom: 6, borderRadius: 10, background: bg, border, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <strong>{opt}.</strong>
                  <MathRenderer content={q[`option${opt}`] as string} style={{ display: 'inline-block' }} />
                </div>
                {isCorrect && <CheckCircleOutlined style={{ color: '#22c55e', marginLeft: 'auto' }} />}
                {isSelected && !isCorrect && <CloseCircleOutlined style={{ color: '#ef4444', marginLeft: 'auto' }} />}
              </div>
            );
          })}
          {(q.explanation as string) && (
            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, color: '#475569', fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span>💡</span>
                <MathRenderer content={q.explanation as string} style={{ display: 'inline-block' }} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
