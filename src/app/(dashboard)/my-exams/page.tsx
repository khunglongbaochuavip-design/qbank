'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/lib/constants';

export default function MyExamsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Record<string, unknown>[]>('/sessions?my=true').then(setSessions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Tên phiên thi', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Đề thi', dataIndex: ['exam', 'name'] },
    { title: 'Số câu', dataIndex: ['exam', '_count', 'examQuestions'] },
    { title: 'Trạng thái', dataIndex: 'status', width: 140,
      render: (s: string) => <Tag color={SESSION_STATUS_COLORS[s]}>{SESSION_STATUS_LABELS[s]}</Tag> },
    { title: 'Bài làm', dataIndex: 'attempt', width: 140,
      render: (a: Record<string, unknown> | null) => a
        ? <Tag color={a.status === 'in_progress' ? 'blue' : 'green'}>{a.status === 'in_progress' ? 'Đang làm' : `Đã nộp (${a.score} đ)`}</Tag>
        : <Tag color="default">Chưa làm</Tag>
    },
    { title: '', width: 120,
      render: (_: unknown, rec: Record<string, unknown>) => {
        const attempt = rec.attempt as Record<string, unknown> | null;
        if (rec.status !== 'active') return null;
        if (attempt && attempt.status !== 'in_progress') return null;
        return <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => router.push(`/take-exam/${rec.id}`)}>{attempt ? 'Tiếp tục' : 'Bắt đầu'}</Button>;
      }
    },
  ];

  return (
    <div>
      <div className="page-header"><h2><PlayCircleOutlined /> Bài thi của tôi</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>
    </div>
  );
}
