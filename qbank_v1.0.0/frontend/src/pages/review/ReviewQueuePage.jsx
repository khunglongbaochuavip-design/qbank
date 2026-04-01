// src/pages/review/ReviewQueuePage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Modal, Input, message, Card, Typography, Row, Col, Descriptions } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import dayjs from 'dayjs';

const { Text, TextArea: TA } = Typography;
const { TextArea } = Input;

export default function ReviewQueuePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetch = () => {
    setLoading(true);
    api.get('/questions', { params: { status: 'pending_review', pageSize: 100 } })
      .then(res => setQuestions(res.data.data))
      .catch(() => message.error('Không thể tải danh sách.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(`approve-${id}`);
    try {
      await api.post(`/questions/${id}/approve`, { comment: 'Đạt yêu cầu' });
      message.success('Đã phê duyệt câu hỏi.');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
    finally { setActionLoading(''); }
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
    setActionLoading('reject');
    try {
      await api.post(`/questions/${rejectModal.id}/reject`, { comment: rejectComment || 'Không đạt yêu cầu' });
      message.success('Đã từ chối câu hỏi.');
      setRejectModal({ open: false, id: null });
      setRejectComment('');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
    finally { setActionLoading(''); }
  };

  const columns = [
    { title: 'Mã câu hỏi', dataIndex: 'questionCode', width: 150, render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'questionText',
      ellipsis: true,
      render: (v, r) => (
        <div>
          <Text ellipsis style={{ display: 'block' }}>{v}</Text>
          <Space size={4} style={{ marginTop: 4 }}>
            {r.subject && <Tag style={{ fontSize: 11 }}>{r.subject.name}</Tag>}
            {r.cognitiveLevel && <Tag color="blue" style={{ fontSize: 11 }}>{r.cognitiveLevel.name}</Tag>}
          </Space>
        </div>
      ),
    },
    { title: 'Người tạo', render: (_, r) => r.createdBy?.fullName || '—', width: 140 },
    {
      title: 'Ngày gửi',
      dataIndex: 'updatedAt',
      width: 120,
      render: v => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    { title: 'Độ khó', dataIndex: 'estimatedDifficulty', width: 90, render: v => <Tag color={v < 0.35 ? 'green' : v < 0.65 ? 'orange' : 'red'}>{(v*100).toFixed(0)}%</Tag> },
    {
      title: 'Thao tác',
      width: 160,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/questions/${r.id}`)}>Xem</Button>
          <Button
            size="small" type="primary" icon={<CheckOutlined />}
            loading={actionLoading === `approve-${r.id}`}
            onClick={() => handleApprove(r.id)}
            style={{ background: '#22c55e', border: 'none' }}
          >Duyệt</Button>
          <Button
            size="small" danger icon={<CloseOutlined />}
            onClick={() => setRejectModal({ open: true, id: r.id })}
          >Từ chối</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⏳ Hàng chờ phê duyệt</div>
          <div className="page-subtitle">Xem xét và phê duyệt câu hỏi từ giáo viên</div>
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <Text style={{ color: '#64748b' }}>
            <strong>{questions.length}</strong> câu hỏi đang chờ phê duyệt
          </Text>
        </div>
        <Table
          dataSource={questions}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          locale={{ emptyText: <div style={{ padding: 40 }}>✅ Không có câu hỏi nào chờ phê duyệt</div> }}
          size="middle"
        />
      </Card>

      <Modal
        open={rejectModal.open}
        title="❌ Từ chối câu hỏi"
        onCancel={() => { setRejectModal({ open: false, id: null }); setRejectComment(''); }}
        onOk={handleReject}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: actionLoading === 'reject' }}
      >
        <Text style={{ display: 'block', color: '#64748b', marginBottom: 12 }}>
          Vui lòng ghi rõ lý do từ chối để giáo viên có thể chỉnh sửa lại:
        </Text>
        <TextArea
          rows={4}
          placeholder="VD: Đáp án chưa rõ ràng, câu hỏi có lỗi chính tả, cần thêm giải thích..."
          value={rejectComment}
          onChange={e => setRejectComment(e.target.value)}
        />
      </Modal>
    </div>
  );
}
