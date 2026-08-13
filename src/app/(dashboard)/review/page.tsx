'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Input } from 'antd';
import { CheckSquareOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { QUESTION_STATUS_LABELS, QUESTION_STATUS_COLORS } from '@/lib/constants';

export default function ReviewPage() {
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

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
    { title: 'Thao tác', width: 180,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => onApprove(rec.id as string)} style={{ background: '#22c55e' }}>Duyệt</Button>
          <Button danger icon={<CloseOutlined />} onClick={() => onReject(rec.id as string)}>Từ chối</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header"><h2><CheckSquareOutlined /> Hàng chờ Phê duyệt</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={questions} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>
    </div>
  );
}
