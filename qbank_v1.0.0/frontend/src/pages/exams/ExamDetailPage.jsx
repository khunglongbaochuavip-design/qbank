// src/pages/exams/ExamDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Typography, Spin, message, Breadcrumb, Progress, Popconfirm, Alert, Row, Col, Descriptions } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, CheckOutlined, SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ExamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get(`/exams/${id}`)
      .then(res => setExam(res.data))
      .catch(() => message.error('Không thể tải đề thi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [id]);

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.post(`/exams/${id}/finalize`);
      message.success('Đề thi đã được chốt thành công!');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
    finally { setFinalizing(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!exam) return null;

  const columns = [
    { title: '#', dataIndex: 'displayOrder', width: 60, render: v => <Text style={{ color: '#94a3b8' }}>{v}</Text> },
    { title: 'Mã câu hỏi', render: (_, r) => <Text code style={{ fontSize: 12 }}>{r.question?.questionCode}</Text>, width: 160 },
    {
      title: 'Nội dung câu hỏi',
      render: (_, r) => <Text ellipsis style={{ maxWidth: 400, display: 'block' }}>{r.question?.questionText}</Text>,
    },
    { title: 'Môn học', render: (_, r) => r.question?.subject?.name || '—', width: 120 },
    { title: 'Chủ đề', render: (_, r) => r.question?.topic?.name || '—', width: 150, ellipsis: true },
    { title: 'Mức', render: (_, r) => r.question?.cognitiveLevel ? <Tag>{r.question.cognitiveLevel.name}</Tag> : '—', width: 120 },
    {
      title: 'Đáp án',
      render: (_, r) => exam.status === 'finalized'
        ? <Tag color="green" style={{ fontWeight: 700 }}>{r.question?.correctOption}</Tag>
        : <Tag color="default">*</Tag>,
      width: 90,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb items={[{ title: <a onClick={() => navigate('/exams')}>Đề thi</a> }, { title: exam.name }]} style={{ marginBottom: 8 }} />
          <div className="page-title">📄 {exam.name}</div>
          <Space style={{ marginTop: 4 }}>
            <Text code style={{ fontSize: 12 }}>{exam.code}</Text>
            <Tag color={exam.status === 'finalized' ? 'green' : 'orange'}>
              {exam.status === 'finalized' ? '✅ Đã chốt' : '📝 Nháp'}
            </Tag>
          </Space>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/exams')}>Quay lại</Button>
          <Button icon={<DownloadOutlined />} onClick={() => window.open(`/api/exams/${id}/export`, '_blank')}>Xuất Excel</Button>
          {exam.status === 'draft' && (
            <Popconfirm
              title="Chốt đề thi?"
              description="Sau khi chốt, không thể chỉnh sửa danh sách câu hỏi."
              onConfirm={handleFinalize}
              okText="Chốt đề thi"
              cancelText="Hủy"
            >
              <Button type="primary" icon={<CheckOutlined />} loading={finalizing} style={{ background: '#22c55e', border: 'none' }}>
                Chốt đề thi
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {exam.status === 'draft' && (
        <Alert
          message="Đề thi đang ở trạng thái Nháp"
          description="Bạn có thể xem xét danh sách câu hỏi và chốt đề khi đã hài lòng. Sau khi chốt, đề thi có thể được dùng để tạo phiên thi trực tuyến."
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📝</div>
            <div>
              <div className="stat-value">{exam.examQuestions?.length || 0}</div>
              <div className="stat-label">Câu hỏi</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>🎯</div>
            <div>
              <div className="stat-value">{exam.matrix?.name || '—'}</div>
              <div className="stat-label">Ma trận</div>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fff7ed', color: '#f59e0b' }}>👤</div>
            <div>
              <div className="stat-value">{exam.createdBy?.fullName || '—'}</div>
              <div className="stat-label">Người tạo</div>
            </div>
          </div>
        </Col>
      </Row>

      <Card
        title={`📋 Danh sách câu hỏi (${exam.examQuestions?.length || 0} câu)`}
        bordered={false}
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={exam.examQuestions}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, size: 'small' }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
