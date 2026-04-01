// src/pages/settings/SettingsPage.jsx
import React, { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Card, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMasterData } from '../../hooks/useMasterData';
import api from '../../api/client';

const { Option } = Select;

function MasterTable({ title, items, columns, onAdd, onEdit, onDelete, addForm, formItems, loading }) {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openAdd = () => { form.resetFields(); setModal({ open: true, editing: null }); };
  const openEdit = (item) => { form.setFieldsValue(item); setModal({ open: true, editing: item }); };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (modal.editing) await onEdit(modal.editing.id, values);
      else await onAdd(values);
      setModal({ open: false, editing: null });
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.error || 'Lỗi.');
    } finally { setSaving(false); }
  };

  const allColumns = [
    ...columns,
    {
      title: 'Thao tác', width: 140, render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa?" onConfirm={() => onDelete(r.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={title}
      bordered={false}
      style={{ borderRadius: 12 }}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd} size="small">Thêm</Button>}
    >
      <Table dataSource={items} columns={allColumns} rowKey="id" size="small" pagination={false} />
      <Modal
        open={modal.open}
        title={modal.editing ? `Sửa ${title}` : `Thêm ${title}`}
        onCancel={() => setModal({ open: false, editing: null })}
        onOk={handleSave}
        okText={modal.editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {formItems}
        </Form>
      </Modal>
    </Card>
  );
}

export default function SettingsPage() {
  const master = useMasterData();
  const [activeTab, setActiveTab] = useState('subjects');

  const crud = (resource) => ({
    onAdd: async (data) => { await api.post(`/master/${resource}`, data); master.invalidate(); window.location.reload(); message.success('Đã thêm.'); },
    onEdit: async (id, data) => { await api.put(`/master/${resource}/${id}`, data); master.invalidate(); window.location.reload(); message.success('Đã cập nhật.'); },
    onDelete: async (id) => { await api.delete(`/master/${resource}/${id}`); master.invalidate(); window.location.reload(); message.success('Đã xóa.'); },
  });

  const tabs = [
    {
      key: 'subjects',
      label: '📚 Môn học',
      children: (
        <MasterTable
          title="Môn học"
          items={master.subjects}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 100, render: v => <Tag>{v}</Tag> },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
            { title: 'Thứ tự', dataIndex: 'sortOrder', width: 90 },
          ]}
          {...crud('subjects')}
          formItems={<>
            <Form.Item name="code" label="Mã môn học" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên môn học" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Mô tả"><Input /></Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự sắp xếp" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          </>}
        />
      ),
    },
    {
      key: 'domains',
      label: '📁 Lĩnh vực',
      children: (
        <MasterTable
          title="Lĩnh vực"
          items={master.domains}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 130, render: v => <Tag>{v}</Tag> },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Môn học', render: (_, r) => r.subject?.name || master.subjects.find(s => s.id === r.subjectId)?.name || '—', width: 120 },
          ]}
          {...crud('domains')}
          formItems={<>
            <Form.Item name="subjectId" label="Môn học" rules={[{ required: true }]}>
              <Select>{master.subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="code" label="Mã lĩnh vực" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên lĩnh vực" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          </>}
        />
      ),
    },
    {
      key: 'topics',
      label: '📌 Chủ đề',
      children: (
        <MasterTable
          title="Chủ đề"
          items={master.topics}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 130, render: v => <Tag>{v}</Tag> },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Lĩnh vực', render: (_, r) => r.domain?.name || master.domains.find(d => d.id === r.domainId)?.name || '—', width: 160 },
          ]}
          {...crud('topics')}
          formItems={<>
            <Form.Item name="domainId" label="Lĩnh vực" rules={[{ required: true }]}>
              <Select>{master.domains.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}</Select>
            </Form.Item>
            <Form.Item name="code" label="Mã chủ đề" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên chủ đề" rules={[{ required: true }]}><Input /></Form.Item>
          </>}
        />
      ),
    },
    {
      key: 'grades',
      label: '🎓 Khối lớp',
      children: (
        <MasterTable
          title="Khối lớp"
          items={master.gradeLevels}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 100, render: v => <Tag>{v}</Tag> },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Thứ tự', dataIndex: 'sortOrder', width: 90 },
          ]}
          {...crud('grade-levels')}
          formItems={<>
            <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          </>}
        />
      ),
    },
    {
      key: 'cognitive',
      label: '🧠 Mức nhận thức',
      children: (
        <MasterTable
          title="Mức nhận thức"
          items={master.cognitiveLevels}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 100, render: v => <Tag>{v}</Tag> },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
            { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80 },
          ]}
          {...crud('cognitive-levels')}
          formItems={<>
            <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="description" label="Mô tả"><Input /></Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          </>}
        />
      ),
    },
    {
      key: 'tags',
      label: '🏷️ Tags',
      children: (
        <MasterTable
          title="Tags"
          items={master.tags}
          columns={[{ title: 'Tên tag', dataIndex: 'name', render: v => <Tag>{v}</Tag> }]}
          {...crud('tags')}
          formItems={<Form.Item name="name" label="Tên tag" rules={[{ required: true }]}><Input /></Form.Item>}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Cài đặt hệ thống</div>
          <div className="page-subtitle">Quản lý dữ liệu danh mục</div>
        </div>
      </div>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} tabBarStyle={{ background: '#fff', borderRadius: '12px 12px 0 0', padding: '0 16px' }} />
    </div>
  );
}
