// src/pages/exams/ExamListPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, message, Typography, Modal, Form, Input, Select, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, DownloadOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

export default function ExamListPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [matrices, setMatrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genModal, setGenModal] = useState(false);
  const [genForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/exams'), api.get('/matrices')])
      .then(([e, m]) => { setExams(e.data); setMatrices(m.data); })
      .catch(() => message.error('Lỗi tải dữ liệu.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleGenerate = async () => {
    try {
      const values = await genForm.validateFields();
      setGenerating(true);
      const res = await api.post('/exams/generate', values);
      message.success('Đã tạo đề thi mới!');
      if (res.data._warnings?.length) {
        res.data._warnings.forEach(w => message.warning(w, 5));
      }
      setGenModal(false);
      genForm.resetFields();
      navigate(`/exams/${res.data.id}`);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.error || 'Lỗi tạo đề thi.');
    } finally { setGenerating(false); }
  };

  const handleFinalize = async (id) => {
    try {
      await api.post(`/exams/${id}/finalize`);
      message.success('Đề thi đã được chốt.');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const handleExport = (id) => {
    window.open(`/api/exams/${id}/export`, '_blank');
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/exams/${id}`);
      message.success('Đã xóa đề thi.');
      fetch();
    } catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const columns = [
    { title: 'Mã đề thi', dataIndex: 'code', width: 200, render: v => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: 'Tên đề thi', dataIndex: 'name', ellipsis: true },
    { title: 'Ma trận', render: (_, r) => r.matrix?.name || '—', ellipsis: true, width: 160 },
    { title: 'Số câu', render: (_, r) => <Tag>{r._count?.examQuestions || 0}</Tag>, width: 90 },
    { title: 'Phiên thi', render: (_, r) => r._count?.sessions || 0, width: 90 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: v => <Tag color={v === 'finalized' ? 'green' : 'orange'}>{v === 'finalized' ? '✅ Đã chốt' : '📝 Nháp'}</Tag>,
    },
    { title: 'Người tạo', render: (_, r) => r.createdBy?.fullName || '—', width: 130 },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 120, render: v => dayjs(v).format('DD/MM/YYYY') },
    {
      title: 'Thao tác',
      width: 200,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/exams/${r.id}`)}>Xem</Button>
          {r.status === 'draft' && (
            <Popconfirm title="Chốt đề thi? Không thể sửa sau khi chốt." onConfirm={() => handleFinalize(r.id)} okText="Chốt" cancelText="Hủy">
              <Button size="small" icon={<CheckOutlined />} type="primary" style={{ background: '#22c55e', border: 'none' }}>Chốt</Button>
            </Popconfirm>
          )}
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(r.id)}>Excel</Button>
          {r.status === 'draft' && (
            <Popconfirm title="Xóa đề thi?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
              <Button size="small" icon={<DeleteOutlined />} danger />
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
          <div className="page-title">📄 Đề thi</div>
          <div className="page-subtitle">Tạo và quản lý đề thi từ ma trận</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setGenModal(true)}>
          Tạo đề thi từ ma trận
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={exams}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'Chưa có đề thi nào. Tạo đề thi đầu tiên!' }}
        />
      </Card>

      <Modal
        open={genModal}
        title="🎲 Tạo đề thi mới từ ma trận"
        onCancel={() => { setGenModal(false); genForm.resetFields(); }}
        onOk={handleGenerate}
        okText="Tạo đề thi"
        cancelText="Hủy"
        confirmLoading={generating}
      >
        <Form form={genForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên đề thi" rules={[{ required: true, message: 'Nhập tên đề thi.' }]}>
            <Input placeholder="VD: Đề kiểm tra Toán 10 - HK1 - Lần 1" />
          </Form.Item>
          <Form.Item name="matrixId" label="Ma trận" rules={[{ required: true, message: 'Chọn ma trận.' }]}>
            <Select placeholder="Chọn ma trận đề thi">
              {matrices.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name} ({m.cells?.reduce((s, c) => s + c.requiredCount, 0) || 0} câu)
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
        <Text style={{ color: '#64748b', fontSize: 13 }}>
          💡 Hệ thống sẽ tự động chọn ngẫu nhiên câu hỏi đã được phê duyệt theo từng ô của ma trận. Bạn có thể chỉnh sửa danh sách câu hỏi trước khi chốt đề.
        </Text>
      </Modal>
    </div>
  );
}
