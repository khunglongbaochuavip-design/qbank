// src/pages/results/ResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Button, Tag, Space, message, Typography, Progress, Statistic, Row, Col } from 'antd';
import { DownloadOutlined, EyeOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

export default function ResultsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/sessions').then(res => {
      const ended = res.data.filter(s => s.status === 'ended' || s._count?.attempts > 0);
      setSessions(res.data);
    });
  }, []);

  const loadResults = async (sessionId) => {
    setSelectedSession(sessionId);
    setLoading(true);
    try {
      const res = await api.get(`/results/sessions/${sessionId}`);
      setResults(res.data);
    } catch { message.error('Không thể tải kết quả.'); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!selectedSession) return;
    const token = localStorage.getItem('qbank_token');
    window.open(`/api/results/sessions/${selectedSession}/export?token=${token}`, '_blank');
  };

  const columns = [
    { title: '#', render: (_, __, idx) => idx + 1, width: 50 },
    { title: 'Họ và tên', render: (_, r) => r.student?.fullName, width: 180 },
    { title: 'Email', render: (_, r) => r.student?.email, ellipsis: true },
    {
      title: 'Điểm',
      dataIndex: 'score',
      width: 120,
      sorter: (a, b) => (a.score || 0) - (b.score || 0),
      defaultSortOrder: 'descend',
      render: v => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ color: v >= 8 ? '#22c55e' : v >= 5 ? '#f59e0b' : '#ef4444', fontSize: 16 }}>
            {v?.toFixed(2) || '0.00'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Đúng / Sai',
      width: 120,
      render: (_, r) => <Text><span style={{ color: '#22c55e' }}>{r.numCorrect || 0}</span> / <span style={{ color: '#ef4444' }}>{r.numWrong || 0}</span></Text>,
    },
    {
      title: 'Kết quả',
      width: 130,
      render: (_, r) => {
        const total = (r.numCorrect || 0) + (r.numWrong || 0);
        const pct = total > 0 ? ((r.numCorrect || 0) / total * 100) : 0;
        return <Progress percent={parseFloat(pct.toFixed(0))} size="small" strokeColor={pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'} />;
      },
    },
    { title: 'Nộp lúc', dataIndex: 'submittedAt', width: 130, render: v => v ? dayjs(v).format('HH:mm DD/MM') : '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: 110, render: v => <Tag color={v === 'submitted' ? 'green' : 'orange'}>{v === 'submitted' ? 'Đã nộp' : 'Chưa nộp'}</Tag> },
    {
      title: '', width: 80,
      render: (_, r) => r.status === 'submitted' && (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/results/attempts/${r.id}`)}>Xem</Button>
      ),
    },
  ];

  // Compute summary stats
  const submitted = results?.attempts?.filter(a => a.status === 'submitted') || [];
  const avgScore = submitted.length ? (submitted.reduce((s, a) => s + (a.score || 0), 0) / submitted.length).toFixed(2) : 0;
  const highest = submitted.length ? Math.max(...submitted.map(a => a.score || 0)).toFixed(2) : 0;
  const lowest = submitted.length ? Math.min(...submitted.map(a => a.score || 0)).toFixed(2) : 0;
  const passRate = submitted.length ? ((submitted.filter(a => a.score >= 5).length / submitted.length) * 100).toFixed(0) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📊 Kết quả & Phân tích</div>
          <div className="page-subtitle">Xem kết quả và xuất dữ liệu phân tích câu hỏi</div>
        </div>
        <Button icon={<DownloadOutlined />} onClick={exportExcel} disabled={!selectedSession} type="primary" style={{ background: '#22c55e', border: 'none' }}>
          Xuất Excel phân tích
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Select
          style={{ width: '100%', maxWidth: 500 }}
          placeholder="Chọn phiên thi để xem kết quả"
          value={selectedSession}
          onChange={loadResults}
          size="large"
        >
          {sessions.map(s => (
            <Option key={s.id} value={s.id}>
              {s.name} — <Tag color={s.status === 'ended' ? 'default' : 'green'}>{s.status === 'ended' ? 'Đã kết thúc' : 'Đang diễn ra'}</Tag>
            </Option>
          ))}
        </Select>
      </Card>

      {results && (
        <>
          {/* Summary cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {[
              { label: 'Số bài đã nộp', value: submitted.length, suffix: `/ ${results.attempts.length}` },
              { label: 'Điểm trung bình', value: avgScore, suffix: '/ 10' },
              { label: 'Điểm cao nhất', value: highest, suffix: '/ 10' },
              { label: 'Tỷ lệ đạt (≥ 5)', value: `${passRate}%` },
            ].map((s, i) => (
              <Col xs={12} sm={6} key={i}>
                <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
                  <Statistic title={s.label} value={s.value} suffix={s.suffix} />
                </Card>
              </Col>
            ))}
          </Row>

          <Card
            title={`📋 Danh sách kết quả — ${results.session?.name}`}
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Table
              dataSource={results.attempts}
              columns={columns}
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
