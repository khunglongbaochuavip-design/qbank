'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Modal, Descriptions, Badge } from 'antd';
import { CheckSquareOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { QUESTION_STATUS_LABELS, QUESTION_STATUS_COLORS } from '@/lib/constants';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/MathRenderer'), { ssr: false });

export default function ReviewPage() {
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<Record<string, unknown> | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ data: Record<string, unknown>[] }>('/questions?status=pending_review&pageSize=50')
      .then(d => setQuestions(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onApprove = async (id: string) => {
    try { await api.post(`/questions/${id}/approve`, {}); message.success('Đã phê duyệt.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onReject = async (id: string) => {
    try { await api.post(`/questions/${id}/reject`, { comment: 'Cần chỉnh sửa' }); message.success('Đã từ chối.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'questionCode', width: 110 },
    { title: 'Nội dung', dataIndex: 'questionText', ellipsis: true,
      render: (t: string) => {
        const cleanText = t ? t.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '';
        return <span>{cleanText}</span>;
      }
    },
    { title: 'Môn', dataIndex: ['subject', 'name'], width: 100 },
    { title: 'Người tạo', dataIndex: ['createdBy', 'fullName'], width: 140 },
    { title: 'Đáp án', dataIndex: 'correctOption', width: 70 },
    { title: 'Thao tác', width: 220,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setViewItem(rec)}>Xem</Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => onApprove(rec.id as string)} style={{ background: '#22c55e' }}>Duyệt</Button>
          <Button danger icon={<CloseOutlined />} onClick={() => onReject(rec.id as string)}>Từ chối</Button>
        </Space>
      ),
    },
  ];

  const correct = viewItem?.correctOption as string;

  return (
    <div>
      <div className="page-header"><h2><CheckSquareOutlined /> Hàng chờ Phê duyệt</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={questions} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      {/* View Question Modal */}
      <Modal
        title={`Xem câu hỏi — ${viewItem?.questionCode as string || ''}`}
        open={!!viewItem}
        onCancel={() => setViewItem(null)}
        footer={[
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => { onReject(viewItem!.id as string); setViewItem(null); }}>Từ chối</Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} style={{ background: '#22c55e' }} onClick={() => { onApprove(viewItem!.id as string); setViewItem(null); }}>Phê duyệt</Button>,
        ]}
        width={760}
      >
        {viewItem && (
          <div style={{ lineHeight: 1.8 }}>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã câu hỏi">{viewItem.questionCode as string}</Descriptions.Item>
              <Descriptions.Item label="Người tạo">{(viewItem.createdBy as Record<string, unknown>)?.fullName as string}</Descriptions.Item>
              <Descriptions.Item label="Môn học">{(viewItem.subject as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khối lớp">{(viewItem.gradeLevel as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
              <Descriptions.Item label="Lĩnh vực">{(viewItem.domain as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chủ đề">{(viewItem.topic as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mức nhận thức">{(viewItem.cognitiveLevel as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mức độ khó">{(viewItem.difficultyLevel as Record<string, unknown>)?.name as string || '—'}</Descriptions.Item>
            </Descriptions>

            {(viewItem.contextText as string) && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#475569', fontStyle: 'italic' }}>
                <strong>Ngữ cảnh:</strong>
                <MathRenderer content={viewItem.contextText as string} />
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, padding: '12px 16px', marginBottom: 14 }}>
              <strong style={{ color: '#1e40af' }}>Câu hỏi:</strong>
              <MathRenderer content={viewItem.questionText as string} />
            </div>

            {(viewItem.questionImage as string) && (
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewItem.questionImage as string}
                  alt="Hình ảnh câu hỏi"
                  style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid #e2e8f0', objectFit: 'contain' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: correct === opt ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  background: correct === opt ? '#f0fdf4' : '#fafafa',
                }}>
                  <strong style={{ color: correct === opt ? '#16a34a' : '#374151' }}>{opt}. {correct === opt ? '✓' : ''}</strong>
                  <MathRenderer content={viewItem[`option${opt}`] as string} style={{ marginLeft: 4 }} />
                </div>
              ))}
            </div>

            {(viewItem.explanation as string) && (
              <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                <strong>Giải thích:</strong>
                <MathRenderer content={viewItem.explanation as string} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
