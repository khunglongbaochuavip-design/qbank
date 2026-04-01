// src/pages/results/MyResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, message, Typography, Progress } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function MyResultsPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/results/my').then(res => setAttempts(res.data)).catch(() => message.error('Lỗi.')).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Tên phiên thi', render: (_, r) => r.session?.name, ellipsis: true },
    { title: 'Đề thi', render: (_, r) => r.session?.exam?.name, ellipsis: true },
    {
      title: 'Điểm',
      dataIndex: 'score',
      width: 90,
      render: v => <Text strong style={{ fontSize: 16, color: v >= 8 ? '#22c55e' : v >= 5 ? '#f59e0b' : '#ef4444' }}>{v?.toFixed(2)}</Text>,
    },
    {
      title: 'Đúng / Sai',
      width: 120,
      render: (_, r) => <Text><span style={{ color: '#22c55e' }}>{r.numCorrect}</span> / <span style={{ color: '#ef4444' }}>{r.numWrong}</span></Text>,
    },
    {
      title: 'Tỷ lệ',
      width: 140,
      render: (_, r) => {
        const total = (r.numCorrect || 0) + (r.numWrong || 0);
        const pct = total > 0 ? ((r.numCorrect || 0) / total * 100) : 0;
        return <Progress percent={parseFloat(pct.toFixed(0))} size="small" strokeColor={pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'} />;
      },
    },
    { title: 'Thời gian nộp', dataIndex: 'submittedAt', width: 140, render: v => v ? dayjs(v).format('HH:mm DD/MM/YYYY') : '—' },
    {
      title: '', width: 80,
      render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/results/attempts/${r.id}`)}>Xem</Button>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📊 Kết quả của tôi</div>
          <div className="page-subtitle">Lịch sử bài làm và điểm số</div>
        </div>
      </div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table dataSource={attempts} columns={columns} rowKey="id" loading={loading} locale={{ emptyText: 'Chưa có bài thi nào được nộp' }} />
      </Card>
    </div>
  );
}
