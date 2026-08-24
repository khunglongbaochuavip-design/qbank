'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, message, Input, Space, Card, Typography, Modal } from 'antd';
import { PlayCircleOutlined, LoginOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/lib/constants';

export default function MyExamsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadSessions = () => {
    api.get<Record<string, unknown>[]>('/sessions?my=true')
      .then(setSessions).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadSessions(); }, []);

  const onJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { message.warning('Vui lòng nhập mã tham gia.'); return; }
    setJoining(true);
    try {
      const res = await api.post<{ session: Record<string, unknown>; alreadyJoined: boolean }>('/sessions/join', { accessCode: code });
      if (res.alreadyJoined) {
        message.info(`Bạn đã tham gia phiên thi "${res.session.name}" trước đó.`);
      } else {
        message.success(`Đã tham gia phiên thi "${res.session.name}" thành công!`);
      }
      setJoinCode('');
      loadSessions();

      // If session is active, ask to start exam right away
      if (res.session.status === 'active') {
        Modal.confirm({
          title: 'Vào thi ngay?',
          content: `Phiên thi "${res.session.name}" đang diễn ra. Bạn có muốn vào làm bài ngay không?`,
          okText: 'Vào thi',
          cancelText: 'Để sau',
          onOk: () => router.push(`/take-exam/${res.session.id}`),
        });
      }
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setJoining(false); }
  };

  const columns = [
    { title: 'Tên phiên thi', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Đề thi', dataIndex: ['exam', 'name'] },
    { title: 'Số câu', dataIndex: ['exam', '_count', 'examQuestions'] },
    { title: 'Trạng thái', dataIndex: 'status', width: 140,
      render: (s: string) => <Tag color={SESSION_STATUS_COLORS[s]}>{SESSION_STATUS_LABELS[s]}</Tag> },
    { title: 'Bài làm', dataIndex: 'attempt', width: 160,
      render: (a: Record<string, unknown> | null) => a
        ? <Tag color={a.status === 'in_progress' ? 'blue' : 'green'}>{a.status === 'in_progress' ? '⏳ Đang làm' : `✅ Đã nộp (${a.score} đ)`}</Tag>
        : <Tag color="default">Chưa làm</Tag>
    },
    { title: '', width: 130,
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

      {/* Join by code card */}
      <Card
        style={{ marginBottom: 20, borderRadius: 12, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Typography.Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          <LoginOutlined /> Tham gia bài thi bằng mã
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          Nhập mã tham gia do giáo viên cung cấp (gồm 6 ký tự, ví dụ: <strong>A3KT7P</strong>)
        </Typography.Text>
        <Space>
          <Input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onPressEnter={onJoin}
            placeholder="Nhập mã tham gia..."
            maxLength={8}
            style={{ width: 220, fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: 4, textAlign: 'center' }}
          />
          <Button type="primary" onClick={onJoin} loading={joining} icon={<LoginOutlined />}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', fontWeight: 600 }}>
            Vào thi
          </Button>
        </Space>
      </Card>

      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>
    </div>
  );
}
