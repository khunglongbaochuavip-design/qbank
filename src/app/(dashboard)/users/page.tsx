'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, Switch, Alert, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SearchOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
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

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; skipped: number; errors: number;
    errorDetails: string[]; skippedDetails: string[];
  } | null>(null);

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

  // ── Import Excel handlers ─────────────────────────────────────
  const onDownloadTemplate = () => {
    api.download('/users/import/template', 'mau_nhap_hoc_sinh.xlsx');
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/users/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) { message.error(json.error || 'Import thất bại.'); return; }
      setImportResult(json.data || json);
      if (json.data?.created > 0 || json.created > 0) load();
    } catch (err) {
      message.error('Lỗi khi import file.');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Mã HS', dataIndex: 'studentCode', width: 100, render: (v: string) => v || '—' },
    { title: 'Lớp/Nhóm', dataIndex: 'className', width: 100, render: (v: string) => v || '—' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Vai trò', dataIndex: 'role', width: 130,
      render: (r: string) => <Tag color={ROLE_COLORS[r] === '#ef4444' ? 'red' : ROLE_COLORS[r] === '#3b82f6' ? 'blue' : ROLE_COLORS[r] === '#22c55e' ? 'green' : ROLE_COLORS[r] === '#f59e0b' ? 'orange' : 'purple'}>{ROLE_LABELS[r]}</Tag> },
    { title: 'Trạng thái', dataIndex: 'isActive', width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Khóa'}</Tag> },
    { title: 'Thao tác', width: 120,
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
        <Space>
          <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
            Tải file mẫu Excel
          </Button>
          <Button
            icon={<UploadOutlined />}
            loading={importing}
            onClick={() => fileInputRef.current?.click()}
            style={{ background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a', fontWeight: 600 }}
          >
            Import học sinh từ Excel
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={onImportFile} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, fontWeight: 600 }}>
            Tạo tài khoản
          </Button>
        </Space>
      </div>

      {/* Import result banner */}
      {importResult && (
        <div style={{ margin: '0 0 12px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>✅ Tạo thành công: {importResult.created}</Tag>
            <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>⏭️ Bỏ qua (trùng): {importResult.skipped}</Tag>
            <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>❌ Lỗi: {importResult.errors}</Tag>
            <Button size="small" onClick={() => setImportResult(null)}>Đóng</Button>
          </div>
          {importResult.errorDetails?.length > 0 && (
            <Alert type="error" style={{ marginBottom: 6 }} message={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {importResult.errorDetails.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {importResult.errorDetails.length > 10 && <li>...và {importResult.errorDetails.length - 10} lỗi khác</li>}
              </ul>
            } />
          )}
          {importResult.skippedDetails?.length > 0 && (
            <Alert type="warning" message={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {importResult.skippedDetails.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
                {importResult.skippedDetails.length > 5 && <li>...và {importResult.skippedDetails.length - 5} dòng khác</li>}
              </ul>
            } />
          )}
        </div>
      )}

      <div className="filter-bar">
        <Input placeholder="Tìm kiếm tên, email, mã học sinh..." prefix={<SearchOutlined />} style={{ width: 320 }}
          value={search} onChange={e => setSearch(e.target.value)} allowClear />
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal title={editItem ? 'Sửa tài khoản' : 'Tạo tài khoản mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onSave} width={520} okText="Lưu" cancelText="Hủy">
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="studentCode" label="Mã học sinh"><Input placeholder="VD: HS001" /></Form.Item>
            <Form.Item name="className" label="Lớp/Nhóm"><Input placeholder="VD: 10A1" /></Form.Item>
          </div>
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
