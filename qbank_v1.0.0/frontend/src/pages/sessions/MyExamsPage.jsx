// src/pages/sessions/MyExamsPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, message, Empty, Typography, Row, Col } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '../../utils/constants';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function MyExamsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/sessions/my')
      .then(res => setSessions(res.data))
      .catch(() => message.error('Không thể tải danh sách bài thi.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🎯 Bài thi của tôi</div>
          <div className="page-subtitle">Xem và tham gia các bài thi được phân công</div>
        </div>
      </div>

      {sessions.length === 0 && !loading ? (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Empty description="Bạn chưa được phân công vào bài thi nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {sessions.map(session => {
            const attempt = session.attempt;
            const isSubmitted = attempt?.status === 'submitted';
            const isInProgress = attempt?.status === 'in_progress';
            const canTake = session.status === 'active' && !isSubmitted;
            const totalQ = session.exam?._count?.examQuestions || 0;

            return (
              <Col key={session.id} xs={24} sm={12} lg={8}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 16, height: '100%', transition: 'box-shadow 0.2s', cursor: 'default' }}
                  hoverable
                >
                  <div style={{ marginBottom: 12 }}>
                    <Tag color={SESSION_STATUS_COLORS[session.status]}>{SESSION_STATUS_LABELS[session.status]}</Tag>
                    {isSubmitted && <Tag color="green" icon={<CheckCircleOutlined />}>Đã nộp bài</Tag>}
                    {isInProgress && <Tag color="orange" icon={<ClockCircleOutlined />}>Đang làm</Tag>}
                  </div>

                  <Title level={5} style={{ margin: '0 0 8px', color: '#0f172a' }}>{session.name}</Title>
                  <Text style={{ color: '#64748b', fontSize: 13 }}>{session.exam?.name}</Text>

                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>Số câu</Text>
                      <Text style={{ fontSize: 13, fontWeight: 600 }}>{totalQ} câu</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>Thời gian</Text>
                      <Text style={{ fontSize: 13, fontWeight: 600 }}>{session.durationMinutes} phút</Text>
                    </div>
                    {session.endTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Hạn nộp</Text>
                        <Text style={{ fontSize: 13, fontWeight: 600 }}>{dayjs(session.endTime).format('HH:mm DD/MM')}</Text>
                      </div>
                    )}
                    {isSubmitted && attempt?.score != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Điểm</Text>
                        <Text style={{ fontSize: 18, fontWeight: 700, color: attempt.score >= 8 ? '#22c55e' : attempt.score >= 5 ? '#f59e0b' : '#ef4444' }}>
                          {attempt.score?.toFixed(2)} / 10
                        </Text>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    {canTake && (
                      <Button type="primary" block icon={<PlayCircleOutlined />} size="large" style={{ height: 44, borderRadius: 10, fontWeight: 600 }}
                        onClick={() => navigate(`/take/${session.id}`)}>
                        {isInProgress ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}
                      </Button>
                    )}
                    {isSubmitted && (
                      <Button block size="large" style={{ height: 44, borderRadius: 10 }} onClick={() => navigate(`/my-results`)}>
                        Xem kết quả
                      </Button>
                    )}
                    {!canTake && !isSubmitted && (
                      <Button block disabled size="large" style={{ height: 44, borderRadius: 10 }}>
                        {session.status === 'scheduled' ? '⏰ Chưa đến giờ thi' : '🔒 Phiên thi đã kết thúc'}
                      </Button>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
