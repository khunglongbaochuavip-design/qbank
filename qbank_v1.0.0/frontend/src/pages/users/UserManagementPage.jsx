// src/pages/users/UserManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, Modal, Form, Input, Select, Popconfirm, message, Typography, Switch } from 'antd';
import { PlusOutlined, EditOutlined, PoweroffOutlined } from '@ant-design/icons';
import api from '../../api/client';
import { ROLE_LABELS } from '../../utils/constants';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const ROLE_COLORS = { super_admin: 'red', academic_admin: 'blue', teacher: 'green', exam_creator: 'orange', student: 'purple' };

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/users').then(res => setUsers(res.data)).catch(() => message.error('Lỗi.')).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (user) => {
    setEditing(user);
    form.setFieldsValue({ fullName: user.fullName, email: user.email, role: user.role, isActive: user.isActive });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await api.put(`/users/${editing.id}`, values);
        message.success('Đã cập nhật người dùng.');
      } else {
        await api.post('/users', values);
        message.success('Đã tạo người dùng mới.');
      }
      setModalOpen(false);
      fetch();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.error || 'Lỗi.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      message.success(user.isActive ? 'Đã vô hiệu hóa.' : 'Đã kích hoạt.');
      fetch();
    } catch { message.error('Lỗi.'); }
  };

  const columns = [
    { title: 'Họ và tên', dataIndex: 'fullName', ellipsis: true },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      width: 160,
      render: v => <Tag color={ROLE_COLORS[v]}>{ROLE_LABELS[v] || v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 120,
      render: v => <Tag color={v ? 'green' : 'default'}>{v ? 'Đang hoạt động' : 'Vô hiệu hóa'}</Tag>,
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', width: 120, render: v => dayjs(v).format('DD/MM/YYYY') },
    {
      title: 'Thao tác',
      width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title={r.isActive ? 'Vô hiệu hóa?' : 'Kích hoạt?'} onConfirm={() => handleToggle(r)} okText="Xác nhận" cancelText="Hủy">
            <Button size="small" icon={<PoweroffOutlined />} danger={r.isActive}>{r.isActive ? 'Tắt' : 'Bật'}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👥 Quản lý người dùng</div>
          <div className="page-subtitle">Quản lý tài khoản và phân quyền</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size="large">Tạo người dùng</Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="middle" />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? '✏️ Sửa người dùng' : '➕ Tạo người dùng mới'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editing ? 'Cập nhật' : 'Tạo mới'}
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          {!editing && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="email@truong.edu.vn" />
            </Form.Item>
          )}
          <Form.Item name="password" label={editing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'} rules={!editing ? [{ required: true, min: 6 }] : []}>
            <Input.Password placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select placeholder="Chọn vai trò">
              {Object.entries(ROLE_LABELS).map(([k, v]) => <Option key={k} value={k}>{v}</Option>)}
            </Select>
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu hóa" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
