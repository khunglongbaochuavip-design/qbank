'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TableOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

interface DomainItem { id: string; name: string; subjectId?: string }
interface TopicItem { id: string; name: string; domainId?: string }

export default function MatricesPage() {
  const [matrices, setMatrices] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [allDomains, setAllDomains] = useState<DomainItem[]>([]);
  const [allTopics, setAllTopics] = useState<TopicItem[]>([]);
  const [filteredDomains, setFilteredDomains] = useState<DomainItem[]>([]);
  const [cogLevels, setCogLevels] = useState<Record<string, unknown>[]>([]);
  const [diffLevels, setDiffLevels] = useState<Record<string, unknown>[]>([]);
  // Per-row domain->topic map derived from allTopics
  const [rowDomainIds, setRowDomainIds] = useState<Record<number, string>>({});
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
    api.get<DomainItem[]>('/domains').then(d => { setAllDomains(d); setFilteredDomains(d); });
    api.get<TopicItem[]>('/topics').then(setAllTopics);
  }, []);

  const onSubjectChange = (subId: string) => {
    if (!subId) { setFilteredDomains(allDomains); return; }
    // Filter domains that belong to selected subject
    const fd = allDomains.filter(d => d.subjectId === subId || !d.subjectId);
    setFilteredDomains(fd);
    // Reset domain/topic selections in all rows
    const items: Record<string, unknown>[] = form.getFieldValue('items') || [];
    form.setFieldsValue({ items: items.map(it => ({ ...it, domainId: undefined, topicId: undefined })) });
    setRowDomainIds({});
  };

  const onRowDomainChange = (rowIndex: number, domainId: string) => {
    setRowDomainIds(prev => ({ ...prev, [rowIndex]: domainId }));
    // Reset topic for that row
    const items: Record<string, unknown>[] = form.getFieldValue('items') || [];
    items[rowIndex] = { ...items[rowIndex], topicId: undefined };
    form.setFieldsValue({ items });
  };

  const topicsForRow = (rowIndex: number): TopicItem[] => {
    const domainId = rowDomainIds[rowIndex];
    if (!domainId) return allTopics;
    return allTopics.filter(t => t.domainId === domainId);
  };

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({ items: [{ requiredCount: 1 }] });
    setRowDomainIds({});
    setFilteredDomains(allDomains);
    setModalOpen(true);
  };

  const openEdit = (rec: Record<string, unknown>) => {
    setEditItem(rec);
    const items = (rec.items as Record<string, unknown>[]) || [];
    form.setFieldsValue({ name: rec.name, description: rec.description, subjectId: rec.subjectId, items });
    if (rec.subjectId) {
      const fd = allDomains.filter(d => d.subjectId === rec.subjectId || !d.subjectId);
      setFilteredDomains(fd);
    } else {
      setFilteredDomains(allDomains);
    }
    // Rebuild rowDomainIds from existing items
    const rdi: Record<number, string> = {};
    items.forEach((it, idx) => { if (it.domainId) rdi[idx] = it.domainId as string; });
    setRowDomainIds(rdi);
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
        onOk={onSave} width={920} okText="Lưu" cancelText="Hủy" styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên ma trận" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="subjectId" label="Môn học">
            <Select placeholder="Chọn môn học..." onChange={onSubjectChange} allowClear>
              {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Các ô ma trận ({fields.length} ô — {fields.reduce((sum, f) => {
                    const items: Record<string, unknown>[] = form.getFieldValue('items') || [];
                    return sum + (Number(items[f.name]?.requiredCount) || 0);
                  }, 0)} câu):</span>
                  <Button type="dashed" size="small" onClick={() => add({ requiredCount: 1 })} icon={<PlusOutlined />}>Thêm ô</Button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 70px 36px', gap: '4px 6px', marginBottom: 4 }}>
                  {['Lĩnh vực', 'Chủ đề', 'Mức nhận thức', 'Độ khó', 'Số câu', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748b', fontWeight: 600, paddingLeft: 4 }}>{h}</div>
                  ))}
                </div>

                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 70px 36px', gap: '4px 6px', marginBottom: 6, alignItems: 'center' }}>
                    <Form.Item {...restField} name={[name, 'domainId']} style={{ margin: 0 }}>
                      <Select placeholder="Lĩnh vực" allowClear size="small"
                        onChange={v => onRowDomainChange(name, v as string)}>
                        {filteredDomains.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'topicId']} style={{ margin: 0 }}>
                      <Select placeholder="Chủ đề" allowClear size="small">
                        {topicsForRow(name).map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'cognitiveLevelId']} style={{ margin: 0 }}>
                      <Select placeholder="Nhận thức" allowClear size="small">
                        {cogLevels.map(c => <Select.Option key={c.id as string} value={c.id as string}>{c.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'difficultyLevelId']} style={{ margin: 0 }}>
                      <Select placeholder="Độ khó" allowClear size="small">
                        {diffLevels.map(d => <Select.Option key={d.id as string} value={d.id as string}>{d.name as string}</Select.Option>)}
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'requiredCount']} style={{ margin: 0 }}>
                      <InputNumber min={1} max={40} size="small" placeholder="SL" style={{ width: '100%' }} />
                    </Form.Item>
                    <Button size="small" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                  </div>
                ))}

                {fields.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px 0' }}>
                    Nhấn "Thêm ô" để bắt đầu tạo ma trận (tối đa 40 ô, mỗi ô có thể yêu cầu nhiều câu).
                  </div>
                )}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
