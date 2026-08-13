'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TableOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

export default function MatricesPage() {
  const [matrices, setMatrices] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [domains, setDomains] = useState<Record<string, unknown>[]>([]);
  const [topics, setTopics] = useState<Record<string, unknown>[]>([]);
  const [cogLevels, setCogLevels] = useState<Record<string, unknown>[]>([]);
  const [diffLevels, setDiffLevels] = useState<Record<string, unknown>[]>([]);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get<Record<string, unknown>[]>('/matrices').then(setMatrices).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<{ id: string; name: string }[]>('/subjects').then(setSubjects);
    api.get<Record<string, unknown>[]>('/master?type=cognitive-levels').then(setCogLevels);
    api.get<Record<string, unknown>[]>('/master?type=difficulty-levels').then(setDiffLevels);
  }, []);

  const loadSubjectData = (subId: string) => {
    if (!subId) return;
    api.get<Record<string, unknown>[]>(`/domains?subjectId=${subId}`).then(setDomains);
    api.get<Record<string, unknown>[]>(`/topics`).then(setTopics);
  };

  const openCreate = () => { setEditItem(null); form.resetFields(); form.setFieldsValue({ items: [{ requiredCount: 1 }] }); setModalOpen(true); };
  const openEdit = (rec: Record<string, unknown>) => {
    setEditItem(rec);
    form.setFieldsValue({ name: rec.name, description: rec.description, subjectId: rec.subjectId, items: (rec.items as Record<string, unknown>[]) || [] });
    if (rec.subjectId) loadSubjectData(rec.subjectId as string);
    setModalOpen(true);
  };

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      if (editItem) {
        await api.patch(`/matrices/${(editItem as Record<string, unknown>).id}`, values);
        message.success('Đã cập nhật ma trận.');
      } else {
        await api.post('/matrices', values);
        message.success('Đã tạo ma trận.');
      }
      setModalOpen(false); load();
    } catch (err: unknown) { message.error((err as Error).message); }
  };

  const onDelete = async (id: string) => {
    try { await api.del(`/matrices/${id}`); message.success('Đã xóa.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const columns = [
    { title: 'Tên ma trận', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Môn', dataIndex: ['subject', 'name'] },
    { title: 'Số ô', dataIndex: 'items', render: (items: unknown[]) => items?.length || 0 },
    { title: 'Tổng câu', dataIndex: 'items', key: 'total', render: (items: { requiredCount: number }[]) => items?.reduce((s, i) => s + i.requiredCount, 0) || 0 },
    { title: 'Thao tác', width: 150,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          <Popconfirm title="Xóa ma trận?" onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><TableOutlined /> Ma trận Đề thi</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, fontWeight: 600 }}>Tạo ma trận</Button>
      </div>
      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={matrices} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal title={editItem ? 'Sửa ma trận' : 'Tạo ma trận'} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onSave} width={850} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="subjectId" label="Môn học">
            <Select placeholder="Chọn..." onChange={v => loadSubjectData(v)} allowClear>
              {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Các ô ma trận:</div>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <Form.Item {...restField} name={[name, 'domainId']} style={{ flex: 1, margin: 0 }}>
                      <Select placeholder="Lĩnh vực" allowClear size="small">
                        {domains.map((d: Record<string, unknown>) => <Select.Option key={d.id as string} value={d.id as string}>{d.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'topicId']} style={{ flex: 1, margin: 0 }}>
                      <Select placeholder="Chủ đề" allowClear size="small">
                        {topics.map((t: Record<string, unknown>) => <Select.Option key={t.id as string} value={t.id as string}>{t.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'cognitiveLevelId']} style={{ flex: 1, margin: 0 }}>
                      <Select placeholder="Mức nhận thức" allowClear size="small">
                        {cogLevels.map((c: Record<string, unknown>) => <Select.Option key={c.id as string} value={c.id as string}>{c.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'difficultyLevelId']} style={{ flex: 1, margin: 0 }}>
                      <Select placeholder="Độ khó" allowClear size="small">
                        {diffLevels.map((d: Record<string, unknown>) => <Select.Option key={d.id as string} value={d.id as string}>{d.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'requiredCount']} style={{ width: 80, margin: 0 }}>
                      <InputNumber min={1} size="small" placeholder="SL" />
                    </Form.Item>
                    <Button size="small" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ requiredCount: 1 })} icon={<PlusOutlined />}>Thêm ô</Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
