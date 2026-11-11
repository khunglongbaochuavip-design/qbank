'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, message, Input, Card, Typography, Modal, Empty } from 'antd';
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
          centered: true,
          title: 'Vào thi ngay?',
          content: `Phiên thi "${res.session.name}" đang diễn ra. Bạn có muốn vào làm bài ngay không?`,
          okText: 'Vào thi ngay',
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
    { title: 'Số câu', dataIndex: ['exam', '_count', 'examQuestions'], width: 80 },
    { title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (s: string) => <Tag color={SESSION_STATUS_COLORS[s]}>{SESSION_STATUS_LABELS[s]}</Tag> },
    { title: 'Bài làm', dataIndex: 'attempt', width: 150,
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

      {/* Join by code card — optimized for mobile portrait & desktop */}
      <Card
        style={{ marginBottom: 20, borderRadius: 14, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe' }}
        styles={{ body: { padding: '16px' } }}
      >
        <Typography.Text strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>
          <LoginOutlined /> Tham gia bài thi bằng mã
        </Typography.Text>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          Nhập mã ca thi 6 ký tự do giáo viên cung cấp (ví dụ: <strong>A3KT7P</strong>)
        </Typography.Text>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onPressEnter={onJoin}
            placeholder="NHẬP MÃ..."
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            style={{
              flex: '1 1 170px',
              maxWidth: 280,
              height: 46,
              fontFamily: 'monospace',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              textAlign: 'center',
              borderRadius: 10,
            }}
          />
          <Button
            type="primary"
            onClick={onJoin}
            loading={joining}
            icon={<LoginOutlined />}
            style={{
              height: 46,
              paddingInline: 24,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              fontWeight: 700,
              fontSize: 15,
              flex: '0 0 auto',
            }}
          >
            Vào thi
          </Button>
        </div>
      </Card>

      {/* Mobile card list (shown on < 768px) */}
      <div className="mobile-only-list">
        {loading ? (
          <Card loading style={{ borderRadius: 12 }} />
        ) : sessions.length === 0 ? (
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Empty description="Chưa có phiên thi nào. Hãy nhập mã tham gia ở trên." />
          </Card>
        ) : (
          sessions.map((rec) => {
            const exam = rec.exam as Record<string, unknown> | undefined;
            const qCount = (exam?._count as { examQuestions?: number } | undefined)?.examQuestions ?? 0;
            const attempt = rec.attempt as Record<string, unknown> | null;
            const canStart = rec.status === 'active' && (!attempt || attempt.status === 'in_progress');
            return (
              <div key={rec.id as string} className="content-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', flex: 1 }}>{rec.name as string}</div>
                  <Tag color={SESSION_STATUS_COLORS[rec.status as string]} style={{ margin: 0 }}>
                    {SESSION_STATUS_LABELS[rec.status as string]}
                  </Tag>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
                  Đề: <strong>{(exam?.name as string) || '—'}</strong> · {qCount} câu · {(rec.durationMinutes as number) || 60} phút
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    {attempt ? (
                      <Tag color={attempt.status === 'in_progress' ? 'blue' : 'green'}>
                        {attempt.status === 'in_progress' ? '⏳ Đang làm dở' : `✅ Đã nộp (${attempt.score} điểm)`}
                      </Tag>
                    ) : (
                      <Tag color="default">Chưa làm</Tag>
                    )}
                  </div>
                  {canStart && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={() => router.push(`/take-exam/${rec.id}`)}
                      style={{ borderRadius: 10, fontWeight: 700, flex: '1 1 160px' }}
                    >
                      {attempt ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table (shown on >= 768px) */}
      <div className="content-card desktop-only-table" style={{ padding: 0 }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" loading={loading} size="middle" scroll={{ x: 640 }} />
      </div>
    </div>
  );
}
