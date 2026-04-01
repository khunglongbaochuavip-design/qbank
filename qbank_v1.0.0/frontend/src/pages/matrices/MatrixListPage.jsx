// src/pages/matrices/MatrixListPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Space, Tag, Popconfirm, message, Typography, Modal, Form, Input, Select, InputNumber, Row, Col, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useMasterData } from '../../hooks/useMasterData';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

export default function MatrixListPage() {
  const navigate = useNavigate();
  const master = useMasterData();
  const [matrices, setMatrices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/matrices')
      .then(res => setMatrices(res.data))
      .catch(() => message.error('Không thể tải ma trận.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/matrices/${id}`);
      message.success('Đã xóa ma trận.');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const columns = [
    { title: 'Tên ma trận', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Môn học', render: (_, r) => r.subject?.name || '—', width: 120 },
    { title: 'Số ô trong ma trận', render: (_, r) => <Tag>{r.cells?.length || 0} ô</Tag>, width: 140 },
    {
      title: 'Tổng câu cần',
      render: (_, r) => {
        const total = r.cells?.reduce((s, c) => s + c.requiredCount, 0) || 0;
        return <Text strong>{total}</Text>;
      },
      width: 130,
    },
    { title: 'Người tạo', render: (_, r) => r.createdBy?.fullName || '—', width: 140 },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 120, render: v => dayjs(v).format('DD/MM/YYYY') },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/matrices/${r.id}`)}>Xem</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/matrices/${r.id}/edit`)}>Sửa</Button>
          <Popconfirm title="Xóa ma trận này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📊 Ma trận đề thi</div>
          <div className="page-subtitle">Xây dựng cấu trúc đề thi theo tiêu chí</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/matrices/new')}>
          Tạo ma trận mới
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={matrices}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'Chưa có ma trận nào. Tạo ma trận đầu tiên!' }}
        />
      </Card>
    </div>
  );
}
