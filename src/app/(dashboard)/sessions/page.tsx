'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm, Switch, Tooltip, Typography } from 'antd';
import { PlusOutlined, PlayCircleOutlined, StopOutlined, DownloadOutlined, DeleteOutlined, CopyOutlined, KeyOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/lib/constants';
import dayjs from 'dayjs';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [exams, setExams] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); api.get<Record<string, unknown>[]>('/sessions').then(setSessions).catch(console.error).finally(() => setLoading(false)); };

  useEffect(() => {
    load();
    api.get<Record<string, unknown>[]>('/exams?status=finalized').then(setExams);
    api.get<{ id: string; fullName: string; email: string }[]>('/users/students').then(setStudents);
  }, []);

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      if (values.startTime) values.startTime = values.startTime.toISOString();
      if (values.endTime) values.endTime = values.endTime.toISOString();
      await api.post('/sessions', values);
      message.success('Đã tạo phiên thi. Mã tham gia đã được tạo tự động!');
      setModalOpen(false); load();
    } catch (err: unknown) { message.error((err as Error).message); }
  };

  const onStart = async (id: string) => {
    try { await api.post(`/sessions/${id}/start`); message.success('Đã kích hoạt phiên thi.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onEnd = async (id: string) => {
    try { await api.post(`/sessions/${id}/end`); message.success('Đã kết thúc phiên thi.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onDelete = async (id: string) => {
    try { await api.del(`/sessions/${id}`); message.success('Đã xóa phiên thi.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onExport = (id: string) => { api.download(`/results/export?sessionId=${id}`, `results_${id}.xlsx`); };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã: ${code}`);
  };

  const columns = [
    { title: 'Tên phiên', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Đề thi', dataIndex: ['exam', 'name'] },
    { title: 'Thời lượng', dataIndex: 'durationMinutes', render: (v: number) => `${v} phút` },
    { title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (s: string) => <Tag color={SESSION_STATUS_COLORS[s]}>{SESSION_STATUS_LABELS[s]}</Tag> },
    {
      title: 'Mã tham gia',
      dataIndex: 'accessCode',
      width: 160,
      render: (code: string, rec: Record<string, unknown>) => (
        <Space>
          <Tooltip title={rec.allowSelfJoin ? 'Học sinh có thể tự tham gia bằng mã này' : 'Chỉ học sinh được phân công mới vào được (dùng mã để xác nhận)'}>
            <Tag color={rec.allowSelfJoin ? 'green' : 'blue'} icon={<KeyOutlined />} style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}
              onClick={() => code && copyCode(code)}>
              {code || '—'}
            </Tag>
          </Tooltip>
          {code && <Button size="small" icon={<CopyOutlined />} onClick={() => copyCode(code)} />}
        </Space>
      ),
    },
    { title: 'Đã vào thi', dataIndex: '_count', width: 90, render: (c: { attempts: number }) => c?.attempts || 0 },
    {
      title: 'Thao tác', width: 260,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          {rec.status === 'scheduled' && <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onStart(rec.id as string)}>Bắt đầu</Button>}
          {rec.status === 'active' && <Button size="small" danger icon={<StopOutlined />} onClick={() => onEnd(rec.id as string)}>Kết thúc</Button>}
          {rec.status === 'ended' && <Button size="small" icon={<DownloadOutlined />} onClick={() => onExport(rec.id as string)}>Xuất Excel</Button>}
          <Popconfirm title="Xóa phiên thi này hoàn toàn?" onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><PlayCircleOutlined /> Phiên thi Trực tuyến</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, fontWeight: 600 }}>Tạo phiên thi</Button>
      </div>

      <div className="content-card" style={{ marginBottom: 12, padding: '12px 16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 10 }}>
        <Typography.Text style={{ color: '#92400e' }}>
          💡 <strong>Mã tham gia</strong> được tạo tự động cho mỗi phiên thi. Học sinh vào trang <strong>"Bài thi của tôi"</strong> → nhập mã để đăng ký. Bật <strong>"Tự tham gia"</strong> để cho phép bất kỳ học sinh nào tự vào mà không cần thêm thủ công.
        </Typography.Text>
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={sessions} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal title="Tạo phiên thi" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onCreate} width={650} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên phiên" rules={[{ required: true }]}><Input placeholder="VD: Kiểm tra Toán 10A1 — Học kỳ 1" /></Form.Item>
          <Form.Item name="examId" label="Đề thi (đã chốt)" rules={[{ required: true }]}>
            <Select placeholder="Chọn đề thi...">
              {exams.map((e: Record<string, unknown>) => <Select.Option key={e.id as string} value={e.id as string}>{e.name as string} ({e.code as string})</Select.Option>)}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="durationMinutes" label="Thời lượng (phút)" initialValue={45}><InputNumber min={5} max={300} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="startTime" label="Bắt đầu"><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" /></Form.Item>
            <Form.Item name="endTime" label="Kết thúc"><DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" /></Form.Item>
          </div>

          <Form.Item name="allowSelfJoin" label="Cho phép học sinh tự tham gia bằng mã" valuePropName="checked" initialValue={true}
            extra="Khi bật: bất kỳ học sinh nào nhập đúng mã đều tự động vào được phiên thi. Tắt: chỉ học sinh trong danh sách bên dưới mới vào được (mã dùng để xác nhận).">
            <Switch checkedChildren="Cho phép" unCheckedChildren="Danh sách cố định" />
          </Form.Item>

          <Form.Item name="studentIds" label="Thêm học sinh theo danh sách (tuỳ chọn)"
            extra="Để trống nếu dùng chế độ tự tham gia. Hoặc thêm trước một số học sinh cụ thể.">
            <Select mode="multiple" placeholder="Tìm học sinh..." showSearch filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())}>
              {students.map(s => <Select.Option key={s.id} value={s.id}>{s.fullName} ({s.email})</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
