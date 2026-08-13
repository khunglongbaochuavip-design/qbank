'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, ThunderboltOutlined, EyeOutlined, DeleteOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { EXAM_STATUS_LABELS } from '@/lib/constants';

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [matrices, setMatrices] = useState<Record<string, unknown>[]>([]);
  const [form] = Form.useForm();

  const load = () => { setLoading(true); api.get<Record<string, unknown>[]>('/exams').then(setExams).catch(console.error).finally(() => setLoading(false)); };

  useEffect(() => { load(); api.get<Record<string, unknown>[]>('/matrices').then(setMatrices); }, []);

  const onGenerate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/exams', values);
      message.success('Đã tạo đề thi!');
      setModalOpen(false); load();
    } catch (err: unknown) { message.error((err as Error).message); }
  };

  const onFinalize = async (id: string) => {
    try { await api.post(`/exams/${id}/publish`); message.success('Đã chốt đề thi.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const onDelete = async (id: string) => {
    try { await api.del(`/exams/${id}`); message.success('Đã xóa.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const columns = [
    { title: 'Tên đề', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Mã', dataIndex: 'code', width: 180 },
    { title: 'Ma trận', dataIndex: ['matrix', 'name'], width: 200 },
    { title: 'Số câu', dataIndex: '_count', width: 80, render: (c: { examQuestions: number }) => c?.examQuestions || 0 },
    { title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: string) => <Tag color={s === 'finalized' ? 'green' : s === 'draft' ? 'default' : 'blue'}>{EXAM_STATUS_LABELS[s]}</Tag> },
    {
      title: 'Thao tác', width: 200,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          {rec.status === 'draft' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => onFinalize(rec.id as string)}>Chốt</Button>
          )}
          <Popconfirm title="Xóa đề thi?" onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><FileTextOutlined /> Đề thi</h2>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: 10, fontWeight: 600 }}>Tạo đề thi từ ma trận</Button>
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={exams} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal title="🎲 Tạo đề thi từ ma trận" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onGenerate} okText="Tạo đề" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên đề thi" rules={[{ required: true }]}><Input placeholder="VD: Kiểm tra Toán 10 - HK1" /></Form.Item>
          <Form.Item name="matrixId" label="Ma trận" rules={[{ required: true }]}>
            <Select placeholder="Chọn ma trận...">
              {matrices.map((m: Record<string, unknown>) => <Select.Option key={m.id as string} value={m.id as string}>{m.name as string}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
