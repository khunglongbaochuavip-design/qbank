// src/pages/questions/QuestionDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { Card, Tag, Button, Space, Descriptions, Timeline, Spin, Typography, Divider, Row, Col, Breadcrumb, message } from 'antd';
import { EditOutlined, CopyOutlined, SendOutlined, CheckOutlined, CloseOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const OPTION_CONF = { A: '#3b82f6', B: '#10b981', C: '#f59e0b', D: '#ef4444' };

export default function QuestionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const fetchQuestion = () => {
    setLoading(true);
    api.get(`/questions/${id}`)
      .then(res => setQuestion(res.data))
      .catch(() => message.error('Không thể tải câu hỏi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuestion(); }, [id]);

  const handleAction = async (action, comment = '') => {
    setActionLoading(action);
    try {
      await api.post(`/questions/${id}/${action}`, { comment });
      message.success(action === 'approve' ? 'Đã phê duyệt câu hỏi.' : action === 'reject' ? 'Đã từ chối câu hỏi.' : 'Đã gửi để phê duyệt.');
      fetchQuestion();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
    finally { setActionLoading(''); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!question) return null;

  const isAdmin = ['super_admin', 'academic_admin'].includes(user.role);
  const canEdit = isAdmin || (user.role === 'teacher' && question.createdById === user.id && ['draft', 'rejected'].includes(question.status));

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb items={[{ title: <a onClick={() => navigate('/questions')}>Câu hỏi</a> }, { title: question.questionCode }]} style={{ marginBottom: 8 }} />
          <div className="page-title">📄 Chi tiết câu hỏi</div>
          <Tag color={STATUS_COLORS[question.status]} className={`status-${question.status}`} style={{ marginTop: 4 }}>
            {STATUS_LABELS[question.status]}
          </Tag>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')}>Quay lại</Button>
          {canEdit && <Button icon={<EditOutlined />} onClick={() => navigate(`/questions/${id}/edit`)}>Chỉnh sửa</Button>}
          <Button icon={<CopyOutlined />} onClick={async () => {
            const res = await api.post(`/questions/${id}/duplicate`);
            navigate(`/questions/${res.data.id}/edit`);
          }}>Sao chép</Button>
          {['draft', 'rejected'].includes(question.status) && (question.createdById === user.id || isAdmin) && (
            <Button type="primary" icon={<SendOutlined />} loading={actionLoading === 'submit'} onClick={() => handleAction('submit')}>
              Gửi phê duyệt
            </Button>
          )}
          {isAdmin && question.status === 'pending_review' && (
            <>
              <Button type="primary" icon={<CheckOutlined />} loading={actionLoading === 'approve'} onClick={() => handleAction('approve')} style={{ background: '#22c55e', border: 'none' }}>
                Phê duyệt
              </Button>
              <Button danger icon={<CloseOutlined />} loading={actionLoading === 'reject'} onClick={() => handleAction('reject', 'Không đạt yêu cầu')}>
                Từ chối
              </Button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Question content */}
          <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
            {question.contextText && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid #3b82f6' }}>
                <Text style={{ color: '#475569', fontStyle: 'italic' }}>Dẫn ngữ: {question.contextText}</Text>
              </div>
            )}

            <Title level={5} style={{ color: '#0f172a', marginBottom: 20 }}>{question.questionText}</Title>

            {question.questionImage && (
              <img src={question.questionImage} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16, border: '1px solid #f0f0f0' }} />
            )}

            {['A', 'B', 'C', 'D'].map(opt => {
              const isCorrect = question.correctOption === opt;
              return (
                <div key={opt} className={`question-option ${isCorrect ? 'correct' : ''}`} style={{ cursor: 'default' }}>
                  <div className="option-label" style={isCorrect ? { background: OPTION_CONF[opt], color: '#fff' } : { background: '#e8e8e8' }}>{opt}</div>
                  <Text>{question[`option${opt}`]}</Text>
                  {isCorrect && <Tag color="green" style={{ marginLeft: 'auto', flexShrink: 0 }}>✓ Đáp án đúng</Tag>}
                </div>
              );
            })}

            {question.explanation && (
              <div style={{ marginTop: 20, background: '#f0fdf4', borderRadius: 8, padding: '12px 16px', borderLeft: '4px solid #22c55e' }}>
                <Text strong style={{ color: '#166534' }}>💡 Giải thích: </Text>
                <Text style={{ color: '#166534' }}>{question.explanation}</Text>
              </div>
            )}

            {question.notes && (
              <div style={{ marginTop: 12, background: '#fffff0', borderRadius: 8, padding: '12px 16px', borderLeft: '4px solid #eab308' }}>
                <Text strong style={{ color: '#713f12' }}>📝 Ghi chú: </Text>
                <Text style={{ color: '#713f12' }}>{question.notes}</Text>
              </div>
            )}
          </Card>

          {/* History */}
          {question.questionHistory?.length > 0 && (
            <Card title="📋 Lịch sử thay đổi" bordered={false} style={{ borderRadius: 12 }}>
              <Timeline
                items={question.questionHistory.map(h => ({
                  color: h.newStatus === 'approved' ? 'green' : h.newStatus === 'rejected' ? 'red' : 'blue',
                  children: (
                    <div>
                      <Text strong>{h.changedBy?.fullName || 'Hệ thống'}</Text>
                      <Text style={{ color: '#64748b', marginLeft: 8, fontSize: 12 }}>{dayjs(h.changedAt).format('DD/MM/YYYY HH:mm')}</Text>
                      <div>
                        {h.oldStatus && <Tag>{STATUS_LABELS[h.oldStatus]}</Tag>}
                        {h.oldStatus && <span style={{ color: '#94a3b8', margin: '0 4px' }}>→</span>}
                        {h.newStatus && <Tag color={STATUS_COLORS[h.newStatus]}>{STATUS_LABELS[h.newStatus]}</Tag>}
                      </div>
                      {h.comment && <Text style={{ color: '#64748b', fontSize: 13 }}>{h.comment}</Text>}
                    </div>
                  ),
                }))}
              />
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          {/* Metadata */}
          <Card title="ℹ️ Thông tin phân loại" bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b', fontWeight: 600 }}>
              <Descriptions.Item label="Mã câu hỏi"><Text code>{question.questionCode}</Text></Descriptions.Item>
              <Descriptions.Item label="Môn học">{question.subject?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Lĩnh vực">{question.domain?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chủ đề">{question.topic?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khối lớp">{question.gradeLevel?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Mức nhận thức">{question.cognitiveLevel ? <Tag>{question.cognitiveLevel.name}</Tag> : '—'}</Descriptions.Item>
              <Descriptions.Item label="Độ khó ước tính">
                <Tag color={question.estimatedDifficulty < 0.35 ? 'green' : question.estimatedDifficulty < 0.65 ? 'orange' : 'red'}>
                  {(question.estimatedDifficulty * 100).toFixed(0)}%
                </Tag>
              </Descriptions.Item>
              {question.empiricalDifficulty != null && (
                <Descriptions.Item label="Độ khó thực nghiệm"><Tag color="blue">{(question.empiricalDifficulty * 100).toFixed(0)}%</Tag></Descriptions.Item>
              )}
              {question.finalDifficulty != null && (
                <Descriptions.Item label="Độ khó chính thức"><Tag color="purple">{(question.finalDifficulty * 100).toFixed(0)}%</Tag></Descriptions.Item>
              )}
              <Descriptions.Item label="Nguồn">{question.sourceReference || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số lần dùng">{question.usageCount}</Descriptions.Item>
              {question.questionTags?.length > 0 && (
                <Descriptions.Item label="Tags">
                  <Space wrap size={4}>{question.questionTags.map(qt => <Tag key={qt.tagId}>{qt.tag.name}</Tag>)}</Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title="👤 Thông tin tác giả" bordered={false} style={{ borderRadius: 12 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b', fontWeight: 600 }}>
              <Descriptions.Item label="Người tạo">{question.createdBy?.fullName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{dayjs(question.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">{dayjs(question.updatedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              {question.reviewedBy && <Descriptions.Item label="Người duyệt">{question.reviewedBy.fullName}</Descriptions.Item>}
              {question.approvedAt && <Descriptions.Item label="Ngày duyệt">{dayjs(question.approvedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
