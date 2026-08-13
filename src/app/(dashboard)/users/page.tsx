'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    const qs = search ? `?search=${search}` : '';
    api.get<Record<string, unknown>[]>(`/users${qs}`).then(setUsers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { api.get<{ id: string; name: string }[]>('/subjects').then(setSubjects).catch(console.error); }, []);
  useEffect(load, [search]);

  const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (rec: Record<string, unknown>) => {
    setEditItem(rec);
    form.setFieldsValue({
      ...rec, subjectIds: ((rec.assignedSubjects as { subject: { id: string } }[]) || []).map(s => s.subject.id),
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      if (editItem) {
        await api.patch(`/users/${(editItem as Record<string, unknown>).id}`, values);
        message.success('Đã cập nhật.');
      } else {
        await api.post('/users', values);
        message.success('Đã tạo tài khoản.');
      }
      setModalOpen(false); load();
    } catch (err: unknown) { message.error((err as Error).message); }
  };

  const onDelete = async (id: string) => {
    try { await api.del(`/users/${id}`); message.success('Đã vô hiệu hóa.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Vai trò', dataIndex: 'role', width: 150,
      render: (r: string) => <Tag color={ROLE_COLORS[r] === '#ef4444' ? 'red' : ROLE_COLORS[r] === '#3b82f6' ? 'blue' : ROLE_COLORS[r] === '#22c55e' ? 'green' : ROLE_COLORS[r] === '#f59e0b' ? 'orange' : 'purple'}>{ROLE_LABELS[r]}</Tag> },
    { title: 'Trạng thái', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Khóa'}</Tag> },
    { title: 'Thao tác', width: 150,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Vô hiệu hóa tài khoản?" onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><UserOutlined /> Quản lý Người dùng</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, fontWeight: 600 }}>
          Tạo tài khoản
        </Button>
      </div>
      <div className="filter-bar">
        <Input placeholder="Tìm kiếm..." prefix={<SearchOutlined />} style={{ width: 300 }}
          value={search} onChange={e => setSearch(e.target.value)} allowClear />
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal title={editItem ? 'Sửa tài khoản' : 'Tạo tài khoản mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onSave} width={500} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input disabled={!!editItem} /></Form.Item>
          {!editItem && <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>}
          {editItem && <Form.Item name="password" label="Mật khẩu mới (để trống nếu không đổi)"><Input.Password /></Form.Item>}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="subjectIds" label="Môn học phụ trách (giáo viên)">
            <Select mode="multiple" placeholder="Chọn...">
              {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          {editItem && <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
}
