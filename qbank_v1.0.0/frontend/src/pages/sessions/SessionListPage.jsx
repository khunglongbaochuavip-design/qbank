// src/pages/sessions/SessionListPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, message, Typography, Modal, Form, Input, Select, DatePicker, InputNumber, Transfer } from 'antd';
import { PlusOutlined, EyeOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '../../utils/constants';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

export default function SessionListPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const fetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/sessions'),
      api.get('/exams', { params: { status: 'finalized' } }),
      api.get('/users/students'),
    ])
      .then(([s, e, st]) => { setSessions(s.data); setExams(e.data); setStudents(st.data); })
      .catch(() => message.error('Lỗi tải dữ liệu.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await api.post('/sessions', {
        ...values,
        studentIds: selectedStudents,
        startTime: values.startTime?.toISOString(),
        endTime: values.endTime?.toISOString(),
      });
      message.success('Đã tạo phiên thi.');
      setCreateModal(false);
      form.resetFields();
      setSelectedStudents([]);
      fetch();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.error || 'Lỗi tạo phiên thi.');
    } finally { setCreating(false); }
  };

  const handleStart = async (id) => {
    try { await api.post(`/sessions/${id}/start`); message.success('Phiên thi đã bắt đầu.'); fetch(); }
    catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const handleEnd = async (id) => {
    try { await api.post(`/sessions/${id}/end`); message.success('Phiên thi đã kết thúc.'); fetch(); }
    catch (err) { message.error(err.response?.data?.error || 'Lỗi.'); }
  };

  const columns = [
    { title: 'Tên phiên thi', dataIndex: 'name', ellipsis: true },
    { title: 'Đề thi', render: (_, r) => r.exam?.name || '—', ellipsis: true, width: 180 },
    { title: 'Bắt đầu', dataIndex: 'startTime', width: 150, render: v => v ? dayjs(v).format('DD/MM HH:mm') : '—' },
    { title: 'Kết thúc', dataIndex: 'endTime', width: 150, render: v => v ? dayjs(v).format('DD/MM HH:mm') : '—' },
    { title: 'Thời gian', dataIndex: 'durationMinutes', width: 110, render: v => `${v} phút` },
    { title: 'Học sinh', render: (_, r) => r.sessionStudents?.length || 0, width: 90 },
    { title: 'Bài nộp', render: (_, r) => r._count?.attempts || 0, width: 90 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: v => <Tag color={SESSION_STATUS_COLORS[v]}>{SESSION_STATUS_LABELS[v]}</Tag>,
    },
    {
      title: 'Thao tác',
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/sessions/${r.id}`)}>Xem</Button>
          {r.status === 'scheduled' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStart(r.id)} style={{ background: '#22c55e', border: 'none' }}>Bắt đầu</Button>
          )}
          {r.status === 'active' && (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => handleEnd(r.id)}>Kết thúc</Button>
          )}
        </Space>
      ),
    },
  ];

  const studentTransferData = students.map(s => ({ key: String(s.id), title: s.fullName, description: s.email }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🎯 Phiên thi trực tuyến</div>
          <div className="page-subtitle">Quản lý và điều hành các buổi thi</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateModal(true)}>
          Tạo phiên thi mới
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
      </Card>

      <Modal
        open={createModal}
        title="➕ Tạo phiên thi mới"
        onCancel={() => { setCreateModal(false); form.resetFields(); setSelectedStudents([]); }}
        onOk={handleCreate}
        okText="Tạo phiên thi"
        cancelText="Hủy"
        confirmLoading={creating}
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên phiên thi" rules={[{ required: true, message: 'Nhập tên phiên thi.' }]}>
            <Input placeholder="VD: Kiểm tra Toán 10 - Lớp 10A1" />
          </Form.Item>
          <Form.Item name="examId" label="Đề thi" rules={[{ required: true, message: 'Chọn đề thi.' }]}>
            <Select placeholder="Chọn đề thi (đã chốt)">
              {exams.map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="durationMinutes" label="Thời gian làm bài (phút)" initialValue={45}>
            <InputNumber min={5} max={240} style={{ width: 200 }} />
          </Form.Item>
          <Space style={{ width: '100%' }} direction="horizontal">
            <Form.Item name="startTime" label="Thời gian bắt đầu">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Chọn thời gian bắt đầu" />
            </Form.Item>
            <Form.Item name="endTime" label="Thời gian kết thúc">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Chọn thời gian kết thúc" />
            </Form.Item>
          </Space>

          <div style={{ marginBottom: 8, fontWeight: 600, color: '#374151' }}>Danh sách học sinh ({selectedStudents.length} đã chọn)</div>
          <Transfer
            dataSource={studentTransferData}
            titles={['Tất cả', 'Được phân công']}
            targetKeys={selectedStudents.map(String)}
            onChange={keys => setSelectedStudents(keys.map(Number))}
            render={item => `${item.title} — ${item.description}`}
            listStyle={{ width: 280, height: 240 }}
            showSearch
          />
        </Form>
      </Modal>
    </div>
  );
}
