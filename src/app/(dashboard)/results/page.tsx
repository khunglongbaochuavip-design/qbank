'use client';
import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Select, message } from 'antd';
import { BarChartOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function ResultsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [attempts, setAttempts] = useState<Record<string, unknown>[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get<Record<string, unknown>[]>('/results').then(setSessions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadSessionResults = (sid: string) => {
    setSelectedSession(sid);
    setDetailLoading(true);
    api.get<Record<string, unknown>[]>(`/results?sessionId=${sid}`).then(setAttempts).catch(console.error).finally(() => setDetailLoading(false));
  };

  const onExport = (sid: string) => { api.download(`/results/export?sessionId=${sid}`, `results_${sid}.xlsx`); };

  const sessionColumns = [
    { title: 'Phiên thi', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Đề', dataIndex: ['exam', 'name'] },
    { title: 'Thí sinh', dataIndex: 'totalParticipants' },
    { title: 'Đã nộp', dataIndex: 'submittedAttempts' },
    { title: 'Điểm TB', dataIndex: 'avgScore', render: (v: number | null) => v !== null ? <Tag color="blue">{v}</Tag> : '—' },
    { title: '', width: 200,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => loadSessionResults(rec.id as string)}>Chi tiết</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => onExport(rec.id as string)}>Excel</Button>
        </div>
      ),
    },
  ];

  const attemptColumns = [
    { title: 'Học sinh', dataIndex: ['student', 'fullName'], render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Email', dataIndex: ['student', 'email'] },
    { title: 'Điểm', dataIndex: 'score', width: 80, render: (v: number) => <Tag color={v >= 5 ? 'green' : 'red'} style={{ fontWeight: 700 }}>{v}</Tag> },
    { title: 'Đúng', dataIndex: 'numCorrect', width: 60 },
    { title: 'Sai', dataIndex: 'numWrong', width: 60 },
    { title: '', width: 80, render: (_: unknown, rec: Record<string, unknown>) => <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/results/${rec.id}`)}>Xem</Button> },
  ];

  return (
    <div>
      <div className="page-header"><h2><BarChartOutlined /> Kết quả & Phân tích</h2></div>

      <div className="content-card">
        <div className="content-card-title">📊 Tổng hợp theo phiên thi</div>
        <Table dataSource={sessions} columns={sessionColumns} rowKey="id" loading={loading} size="middle" />
      </div>

      {selectedSession && (
        <div className="content-card">
          <div className="content-card-title">📝 Chi tiết bài thi</div>
          <Table dataSource={attempts} columns={attemptColumns} rowKey="id" loading={detailLoading} size="middle" />
        </div>
      )}
    </div>
  );
}
