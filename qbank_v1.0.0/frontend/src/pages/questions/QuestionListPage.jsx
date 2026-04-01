// src/pages/questions/QuestionListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Tooltip, Popconfirm, message, Row, Col, Card, Badge, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined, EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import { useMasterData } from '../../hooks/useMasterData';

const { Text } = Typography;
const { Option } = Select;

export default function QuestionListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const master = useMasterData();

  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', subjectId: null, domainId: null, topicId: null, cognitiveLevelId: null, status: null, hasImage: null });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchQuestions = useCallback(async (currentPage = page, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = { page: currentPage, pageSize: PAGE_SIZE };
      Object.entries(currentFilters).forEach(([k, v]) => { if (v !== null && v !== '') params[k] = v; });
      const res = await api.get('/questions', { params });
      setQuestions(res.data.data);
      setTotal(res.data.total);
    } catch { message.error('Không thể tải danh sách câu hỏi.'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchQuestions(1, filters); setPage(1); }, [filters]);

  const handleFilter = (key, value) => setFilters(f => ({ ...f, [key]: value || null }));

  const handleSubmitForReview = async (id) => {
    try {
      await api.post(`/questions/${id}/submit`);
      message.success('Đã gửi câu hỏi để phê duyệt.');
      fetchQuestions();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/questions/${id}/duplicate`);
      message.success('Đã sao chép câu hỏi.');
      navigate(`/questions/${res.data.id}/edit`);
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const handleArchive = async (id) => {
    try {
      await api.delete(`/questions/${id}`);
      message.success('Đã lưu trữ câu hỏi.');
      fetchQuestions();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const canEdit = (q) => {
    if (['super_admin', 'academic_admin'].includes(user.role)) return true;
    if (user.role === 'teacher' && q.createdById === user.id && ['draft', 'rejected'].includes(q.status)) return true;
    return false;
  };

  const columns = [
    {
      title: 'Mã câu hỏi',
      dataIndex: 'questionCode',
      key: 'code',
      width: 150,
      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Nội dung câu hỏi',
      dataIndex: 'questionText',
      key: 'text',
      ellipsis: true,
      render: (v, r) => (
        <div>
          {r.questionImage && <Tag color="blue" style={{ marginBottom: 4 }}>📷 Có ảnh</Tag>}
          <Text ellipsis style={{ display: 'block' }}>{v}</Text>
        </div>
      ),
    },
    { title: 'Môn học', render: (_, r) => r.subject?.name || '—', width: 110 },
    { title: 'Chủ đề', render: (_, r) => r.topic?.name || '—', width: 150, ellipsis: true },
    {
      title: 'Mức nhận thức',
      render: (_, r) => r.cognitiveLevel ? <Tag>{r.cognitiveLevel.name}</Tag> : '—',
      width: 130,
    },
    {
      title: 'Độ khó',
      dataIndex: 'estimatedDifficulty',
      width: 90,
      render: (v) => {
        const color = v < 0.35 ? 'green' : v < 0.65 ? 'orange' : 'red';
        return <Tag color={color}>{(v * 100).toFixed(0)}%</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v]} className={`status-${v}`}>{STATUS_LABELS[v]}</Tag>,
    },
    {
      title: 'Người tạo',
      render: (_, r) => r.createdBy?.fullName || '—',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Xem">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/questions/${r.id}`)} />
          </Tooltip>
          {canEdit(r) && (
            <Tooltip title="Sửa">
              <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/questions/${r.id}/edit`)} />
            </Tooltip>
          )}
          <Tooltip title="Sao chép">
            <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)} />
          </Tooltip>
          {['draft', 'rejected'].includes(r.status) && (r.createdById === user.id || ['super_admin', 'academic_admin'].includes(user.role)) && (
            <Tooltip title="Gửi phê duyệt">
              <Button size="small" icon={<SendOutlined />} type="primary" onClick={() => handleSubmitForReview(r.id)} />
            </Tooltip>
          )}
          {['super_admin', 'academic_admin'].includes(user.role) && r.status !== 'archived' && (
            <Popconfirm title="Lưu trữ câu hỏi này?" onConfirm={() => handleArchive(r.id)} okText="Xác nhận" cancelText="Hủy">
              <Tooltip title="Lưu trữ">
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📚 Ngân hàng câu hỏi</div>
          <div className="page-subtitle">Quản lý toàn bộ câu hỏi trắc nghiệm</div>
        </div>
        {['super_admin', 'academic_admin', 'teacher'].includes(user.role) && (
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/questions/new')}>
            Tạo câu hỏi mới
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 12 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo mã, nội dung câu hỏi..."
              allowClear
              onChange={e => handleFilter('search', e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Select style={{ width: '100%' }} placeholder="Môn học" allowClear onChange={v => handleFilter('subjectId', v)}>
              {master.subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Select style={{ width: '100%' }} placeholder="Chủ đề" allowClear onChange={v => handleFilter('topicId', v)}>
              {master.topics.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={3}>
            <Select style={{ width: '100%' }} placeholder="Mức nhận thức" allowClear onChange={v => handleFilter('cognitiveLevelId', v)}>
              {master.cognitiveLevels.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={3}>
            <Select style={{ width: '100%' }} placeholder="Trạng thái" allowClear onChange={v => handleFilter('status', v)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
            </Select>
          </Col>
          <Col xs={12} sm={8} lg={3}>
            <Select style={{ width: '100%' }} placeholder="Có ảnh?" allowClear onChange={v => handleFilter('hasImage', v)}>
              <Option value="true">Có ảnh</Option>
              <Option value="false">Không có ảnh</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#64748b' }}>Tổng cộng: <strong>{total.toLocaleString('vi-VN')}</strong> câu hỏi</Text>
          <Button icon={<ExportOutlined />} onClick={() => {
            const token = localStorage.getItem('qbank_token');
            window.open(`/api/import-export/export?token=${token}`, '_blank');
          }}>
            Xuất Excel
          </Button>
        </div>
        <Table
          dataSource={questions}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} câu hỏi`,
            onChange: (p) => { setPage(p); fetchQuestions(p); },
          }}
          size="middle"
          locale={{ emptyText: <div style={{ padding: 32, color: '#94a3b8' }}>Không tìm thấy câu hỏi phù hợp</div> }}
        />
      </Card>
    </div>
  );
}
