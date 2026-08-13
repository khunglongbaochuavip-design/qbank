'use client';
import React, { useEffect, useState } from 'react';
import { Card, Statistic, Table, Spin, Tag } from 'antd';
import { TeamOutlined, BookOutlined, FileTextOutlined, BarChartOutlined, PlayCircleOutlined, TrophyOutlined, DashboardOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((d) => setData(d as Record<string, unknown>)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  if (user?.role === 'student') {
    return (
      <div>
        <div className="page-header"><h2><DashboardOutlined /> Tổng quan</h2></div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#ede9fe' }}>📝</div>
            <div className="stat-card-value">{(data as Record<string, unknown>).mySessions as number || 0}</div>
            <div className="stat-card-label">Bài thi được phân công</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#e0f2fe' }}>✅</div>
            <div className="stat-card-value">{(data as Record<string, unknown>).myAttempts as number || 0}</div>
            <div className="stat-card-label">Bài thi đã hoàn thành</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: '#dcfce7' }}>🏆</div>
            <div className="stat-card-value">{(data as Record<string, unknown>).avgScore as number ?? '—'}</div>
            <div className="stat-card-label">Điểm trung bình</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = data.stats as Record<string, number>;
  const qStatus = data.questionsByStatus as Record<string, number>;
  const recents = data.recentAttempts as { id: string; studentName: string; examName: string; score: number; submittedAt: string }[];

  const DashboardOutlinedIcon = () => <DashboardOutlined />;

  return (
    <div>
      <div className="page-header"><h2><DashboardOutlinedIcon /> Tổng quan hệ thống</h2></div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#dbeafe' }}><TeamOutlined style={{ color: '#3b82f6' }} /></div>
          <div className="stat-card-value">{stats?.totalUsers || 0}</div>
          <div className="stat-card-label">Tổng người dùng</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#dcfce7' }}><BookOutlined style={{ color: '#22c55e' }} /></div>
          <div className="stat-card-value">{stats?.totalQuestions || 0}</div>
          <div className="stat-card-label">Câu hỏi</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fef3c7' }}><FileTextOutlined style={{ color: '#f59e0b' }} /></div>
          <div className="stat-card-value">{stats?.totalExams || 0}</div>
          <div className="stat-card-label">Đề thi</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#ede9fe' }}><PlayCircleOutlined style={{ color: '#8b5cf6' }} /></div>
          <div className="stat-card-value">{stats?.totalSessions || 0}</div>
          <div className="stat-card-label">Phiên thi</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="content-card">
          <div className="content-card-title"><BarChartOutlined /> Câu hỏi theo trạng thái</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Tag color="default">Nháp: {qStatus?.draft || 0}</Tag>
            <Tag color="orange">Chờ duyệt: {qStatus?.pending_review || 0}</Tag>
            <Tag color="green">Đã duyệt: {qStatus?.approved || 0}</Tag>
            <Tag color="red">Từ chối: {qStatus?.rejected || 0}</Tag>
            <Tag color="purple">Lưu trữ: {qStatus?.archived || 0}</Tag>
          </div>
        </div>
        <div className="content-card">
          <div className="content-card-title"><TrophyOutlined /> Bài thi gần đây</div>
          <Table size="small" pagination={false} dataSource={recents || []} rowKey="id" columns={[
            { title: 'Học sinh', dataIndex: 'studentName' },
            { title: 'Đề thi', dataIndex: 'examName' },
            { title: 'Điểm', dataIndex: 'score', render: (v: number) => <Tag color={v >= 5 ? 'green' : 'red'}>{v}</Tag> },
          ]} />
        </div>
      </div>
    </div>
  );
}
