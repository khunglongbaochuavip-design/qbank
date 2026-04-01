// src/pages/dashboard/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert, Typography, Badge } from 'antd';
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, PlayCircleOutlined, BarChartOutlined, UserOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
dayjs.locale('vi');

const { Title, Text } = Typography;
const PIE_COLORS = ['#52c41a', '#fa8c16', '#8c8c8c', '#ff4d4f', '#722ed1'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(() => setError('Không thể tải dữ liệu tổng quan.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <Alert message={error} type="error" />;

  const pieData = [
    { name: 'Đã duyệt', value: stats.questions.approved },
    { name: 'Chờ duyệt', value: stats.questions.pending },
    { name: 'Nháp', value: stats.questions.draft },
    { name: 'Từ chối', value: stats.questions.rejected },
  ].filter(d => d.value > 0);

  const statCards = [
    { label: 'Tổng câu hỏi', value: stats.questions.total, icon: <BookOutlined />, color: '#3b82f6', bg: '#eff6ff', sub: `${stats.questions.approved} đã duyệt` },
    { label: 'Chờ phê duyệt', value: stats.questions.pending, icon: <ClockCircleOutlined />, color: '#f59e0b', bg: '#fffbeb', sub: 'Cần xem xét' },
    { label: 'Đề thi đã chốt', value: stats.exams.finalized, icon: <FileTextOutlined />, color: '#8b5cf6', bg: '#f5f3ff', sub: `Tổng ${stats.exams.total} đề` },
    { label: 'Bài đã nộp', value: stats.attempts.completed, icon: <CheckCircleOutlined />, color: '#22c55e', bg: '#f0fdf4', sub: `Tổng ${stats.attempts.total} lượt` },
  ];

  const pendingColumns = [
    { title: 'Mã câu hỏi', dataIndex: 'questionCode', key: 'code', width: 160, render: v => <Text code>{v}</Text> },
    { title: 'Nội dung', dataIndex: 'questionText', key: 'text', ellipsis: true, render: v => <Text ellipsis>{v}</Text> },
    { title: 'Môn học', render: (_, r) => r.subject?.name || '—', width: 120 },
    { title: 'Tác giả', render: (_, r) => r.createdBy?.fullName || '—', width: 140 },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: v => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag> },
  ];

  const sessionColumns = [
    { title: 'Phiên thi', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Đề thi', render: (_, r) => r.exam?.name, ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'status', width: 130, render: v => <Tag color={v === 'active' ? 'green' : v === 'ended' ? 'default' : 'blue'}>{v === 'active' ? 'Đang thi' : v === 'ended' ? 'Đã kết thúc' : 'Chưa bắt đầu'}</Tag> },
    { title: 'Số bài', render: (_, r) => r._count?.attempts || 0, width: 90 },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
          👋 Chào mừng, {user?.fullName}!
        </Title>
        <Text style={{ color: '#64748b' }}>
          {dayjs().format('dddd, DD/MM/YYYY')} · {user?.role && ROLE_LABELS_MAP[user.role]}
        </Text>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-value">{s.value?.toLocaleString('vi-VN')}</div>
                <div className="stat-label">{s.label}</div>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>{s.sub}</Text>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Charts row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="Câu hỏi theo môn học" bordered={false} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.questionsBySubject} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Tổng số" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="approved" name="Đã duyệt" fill="#22c55e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Phân bổ trạng thái câu hỏi" bordered={false} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Câu hỏi']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent tables */}
      <Row gutter={[16, 16]}>
        {['super_admin', 'academic_admin'].includes(user.role) && (
          <Col xs={24} lg={14}>
            <Card title={<span>⏳ Câu hỏi chờ phê duyệt <Badge count={stats.questions.pending} style={{ background: '#fa8c16', marginLeft: 8 }} /></span>} bordered={false} style={{ borderRadius: 12 }}>
              <Table
                dataSource={stats.recentPending}
                columns={pendingColumns}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{ emptyText: '✅ Không có câu hỏi chờ phê duyệt' }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} lg={user.role === 'student' ? 24 : 10}>
          <Card title="📋 Phiên thi gần đây" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              dataSource={stats.recentSessions}
              columns={sessionColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Chưa có phiên thi nào' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

const ROLE_LABELS_MAP = {
  super_admin: 'Quản trị hệ thống', academic_admin: 'Quản lý học thuật',
  teacher: 'Giáo viên', exam_creator: 'Xây dựng đề thi', student: 'Học sinh',
};
