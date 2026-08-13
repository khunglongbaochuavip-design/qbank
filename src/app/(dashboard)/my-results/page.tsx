'use client';
import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, message } from 'antd';
import { BarChartOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function MyResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Record<string, unknown>[]>('/results?my=true').then(setResults).catch(console.error).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Đề thi', dataIndex: ['session', 'exam', 'name'] },
    { title: 'Điểm', dataIndex: 'score', width: 80, render: (v: number) => <Tag color={v >= 5 ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 700 }}>{v}</Tag> },
    { title: 'Đúng', dataIndex: 'numCorrect', width: 60 },
    { title: 'Sai', dataIndex: 'numWrong', width: 60 },
    { title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: string) => <Tag color={s === 'submitted' ? 'green' : s === 'auto_submitted' ? 'orange' : 'red'}>{s === 'submitted' ? 'Đã nộp' : s === 'auto_submitted' ? 'Tự động nộp' : 'Hết giờ'}</Tag> },
    { title: 'Thời gian nộp', dataIndex: 'submittedAt', render: (v: string) => v ? new Date(v).toLocaleString('vi-VN') : '—' },
    { title: '', width: 80,
      render: (_: unknown, rec: Record<string, unknown>) => <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/results/${rec.id}`)}>Xem</Button>
    },
  ];

  return (
    <div>
      <div className="page-header"><h2><BarChartOutlined /> Kết quả của tôi</h2></div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={results} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>
    </div>
  );
}
