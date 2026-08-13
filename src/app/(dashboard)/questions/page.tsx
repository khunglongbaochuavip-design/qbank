'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Input, Select, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SendOutlined, CheckOutlined, CloseOutlined, ExportOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { QUESTION_STATUS_LABELS, QUESTION_STATUS_COLORS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MathEditor = dynamic(() => import('@/components/MathEditor'), { ssr: false });

export default function QuestionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ total: number; data: Record<string, unknown>[] }>({ total: 0, data: [] });
  const [loading, setLoading] = useState(true);

  const onExport = () => {
    const qs = new URLSearchParams();
    if (filters.search) qs.set('search', filters.search);
    if (filters.status) qs.set('status', filters.status);
    if (filters.subjectId) qs.set('subjectId', filters.subjectId);
    api.download(`/questions/export?${qs}`, 'qbank_questions_export.xlsx');
  };

  const [filters, setFilters] = useState({ search: '', status: '', subjectId: '', page: 1, pageSize: 20 });
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [domains, setDomains] = useState<Record<string, unknown>[]>([]);
  const [topics, setTopics] = useState<Record<string, unknown>[]>([]);
  const [gradeLevels, setGradeLevels] = useState<Record<string, unknown>[]>([]);
  const [cogLevels, setCogLevels] = useState<Record<string, unknown>[]>([]);
  const [diffLevels, setDiffLevels] = useState<Record<string, unknown>[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filters.search) qs.set('search', filters.search);
    if (filters.status) qs.set('status', filters.status);
    if (filters.subjectId) qs.set('subjectId', filters.subjectId);
    qs.set('page', String(filters.page));
    qs.set('pageSize', String(filters.pageSize));
    api.get(`/questions?${qs}`).then((d) => setData(d as typeof data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/subjects').then(setSubjects).catch(console.error);
    api.get<Record<string, unknown>[]>('/master?type=grade-levels').then(setGradeLevels).catch(console.error);
    api.get<Record<string, unknown>[]>('/master?type=cognitive-levels').then(setCogLevels).catch(console.error);
    api.get<Record<string, unknown>[]>('/master?type=difficulty-levels').then(setDiffLevels).catch(console.error);
    api.get<{ id: string; name: string }[]>('/master?type=tags').then(setTags).catch(console.error);
  }, []);
  useEffect(load, [filters]);

  const loadDomains = async (subjectId: string) => {
    const d = await api.get<Record<string, unknown>[]>(`/domains?subjectId=${subjectId}`);
    setDomains(d);
    setTopics([]);
    form.setFieldsValue({ domainId: null, topicId: null });
  };
  const loadTopics = async (domainId: string) => {
    const t = await api.get<Record<string, unknown>[]>(`/topics?domainId=${domainId}`);
    setTopics(t);
    form.setFieldsValue({ topicId: null });
  };

  const openCreate = () => { setEditItem(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (rec: Record<string, unknown>) => {
    setEditItem(rec);
    const tagIds = (rec.questionTags as { tagId?: string; tag?: { id: string } }[])?.map(qt => qt.tagId || qt.tag?.id).filter(Boolean) || [];
    form.setFieldsValue({ ...rec, tagIds, difficultyLevelId: rec.difficultyLevelId || null });
    if (rec.subjectId) loadDomains(rec.subjectId as string);
    if (rec.domainId) loadTopics(rec.domainId as string);
    setModalOpen(true);
  };


  const onSave = async () => {
    try {
      const values = await form.validateFields();
      if (editItem) {
        await api.patch(`/questions/${(editItem as Record<string, unknown>).id}`, values);
        message.success('Đã cập nhật câu hỏi.');
      } else {
        await api.post('/questions', values);
        message.success('Đã tạo câu hỏi mới.');
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) { message.error((err as Error).message); }
  };

  const onSubmitReview = async (id: string) => {
    try { await api.post(`/questions/${id}/submit-review`); message.success('Đã gửi phê duyệt.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onApprove = async (id: string) => {
    try { await api.post(`/questions/${id}/approve`, {}); message.success('Đã phê duyệt.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onReject = async (id: string) => {
    try { await api.post(`/questions/${id}/reject`, { comment: 'Cần chỉnh sửa' }); message.success('Đã từ chối.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };
  const onDelete = async (id: string) => {
    try { await api.del(`/questions/${id}`); message.success('Đã xóa câu hỏi hoàn toàn.'); load(); }
    catch (err: unknown) { message.error((err as Error).message); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'questionCode', width: 120 },
    { title: 'Nội dung', dataIndex: 'questionText', ellipsis: true,
      render: (t: string) => {
        const cleanText = t ? t.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '';
        return <span style={{ fontWeight: 500 }}>{cleanText.substring(0, 60)}{cleanText.length > 60 ? '...' : ''}</span>;
      }
    },
    { title: 'Môn', dataIndex: ['subject', 'name'], width: 100 },
    { title: 'Chủ đề', dataIndex: ['topic', 'name'], width: 120 },
    { title: 'Thẻ', width: 120,
      render: (_: unknown, rec: Record<string, unknown>) => {
        const qTags = (rec.questionTags as { tag?: { id: string; name: string } }[]) || [];
        if (!qTags.length) return '—';
        return (
          <Space size={2} wrap>
            {qTags.map(qt => qt.tag?.name && <Tag key={qt.tag.id} color="purple">{qt.tag.name}</Tag>)}
          </Space>
        );
      }
    },
    { title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (s: string) => <Tag color={QUESTION_STATUS_COLORS[s]}>{QUESTION_STATUS_LABELS[s]}</Tag> },
    { title: 'Đáp án', dataIndex: 'correctOption', width: 70, align: 'center' as const },
    {
      title: 'Thao tác', width: 200,
      render: (_: unknown, rec: Record<string, unknown>) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          {['draft', 'rejected'].includes(rec.status as string) && (
            <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => onSubmitReview(rec.id as string)}>Gửi</Button>
          )}
          {rec.status === 'pending_review' && ['super_admin', 'admin', 'exam_officer'].includes(user?.role || '') && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => onApprove(rec.id as string)} style={{ background: '#22c55e' }} />
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => onReject(rec.id as string)} />
            </>
          )}
          <Popconfirm title="Xóa hoàn toàn câu hỏi?" description="Hành động này không thể hoàn tác!" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(rec.id as string)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>📝 Ngân hàng Câu hỏi</h2>
        <Space>
          <Button icon={<ExportOutlined />} onClick={onExport} style={{ borderRadius: 10, fontWeight: 600 }}>
            Xuất Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, fontWeight: 600 }}>
            Tạo câu hỏi
          </Button>
        </Space>
      </div>

      <div className="filter-bar">
        <Input placeholder="Tìm kiếm..." prefix={<SearchOutlined />} style={{ width: 250 }}
          value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} allowClear />
        <Select placeholder="Môn học" style={{ width: 150 }} allowClear value={filters.subjectId || undefined}
          onChange={v => setFilters(f => ({ ...f, subjectId: v || '', page: 1 }))}>
          {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
        </Select>
        <Select placeholder="Trạng thái" style={{ width: 140 }} allowClear value={filters.status || undefined}
          onChange={v => setFilters(f => ({ ...f, status: v || '', page: 1 }))}>
          {Object.entries(QUESTION_STATUS_LABELS).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
        </Select>
      </div>

      <div className="content-card" style={{ padding: 0 }}>
        <Table dataSource={data.data} columns={columns} rowKey="id" loading={loading} size="middle"
          pagination={{ current: filters.page, pageSize: filters.pageSize, total: data.total, showSizeChanger: true,
            onChange: (p, ps) => setFilters(f => ({ ...f, page: p, pageSize: ps })) }} />
      </div>

      <Modal title={editItem ? 'Sửa câu hỏi' : 'Tạo câu hỏi mới'} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={onSave} width={800} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="subjectId" label="Môn học">
              <Select placeholder="Chọn..." onChange={v => loadDomains(v)} allowClear>
                {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="domainId" label="Lĩnh vực">
              <Select placeholder="Chọn..." onChange={v => loadTopics(v)} allowClear>
                {domains.map((d: Record<string, unknown>) => <Select.Option key={d.id as string} value={d.id as string}>{d.name as string}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="topicId" label="Chủ đề">
              <Select placeholder="Chọn..." allowClear>
                {topics.map((t: Record<string, unknown>) => <Select.Option key={t.id as string} value={t.id as string}>{t.name as string}</Select.Option>)}
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="gradeLevelId" label="Khối lớp">
              <Select placeholder="Chọn..." allowClear>
                {gradeLevels.map((g: Record<string, unknown>) => <Select.Option key={g.id as string} value={g.id as string}>{g.name as string}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="cognitiveLevelId" label="Mức nhận thức">
              <Select placeholder="Chọn..." allowClear>
                {cogLevels.map((c: Record<string, unknown>) => <Select.Option key={c.id as string} value={c.id as string}>{c.name as string}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="difficultyLevelId" label="Mức độ khó">
              <Select placeholder="Chọn mức độ..." allowClear>
                {diffLevels.map((d: Record<string, unknown>) => (
                  <Select.Option key={d.id as string} value={d.id as string}>{d.name as string}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="tagIds" label="Thẻ (Tags)">
            <Select mode="multiple" placeholder="Chọn thẻ đính kèm..." allowClear>
              {tags.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="questionText" label="Nội dung câu hỏi" rules={[{ required: true, message: 'Bắt buộc!' }]}>
            <MathEditor placeholder="Nhập nội dung câu hỏi..." rows={3} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="optionA" label="Đáp án A" rules={[{ required: true }]}>
              <MathEditor placeholder="Đáp án A" rows={1} />
            </Form.Item>
            <Form.Item name="optionB" label="Đáp án B" rules={[{ required: true }]}>
              <MathEditor placeholder="Đáp án B" rows={1} />
            </Form.Item>
            <Form.Item name="optionC" label="Đáp án C" rules={[{ required: true }]}>
              <MathEditor placeholder="Đáp án C" rows={1} />
            </Form.Item>
            <Form.Item name="optionD" label="Đáp án D" rules={[{ required: true }]}>
              <MathEditor placeholder="Đáp án D" rows={1} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <Form.Item name="correctOption" label="Đáp án đúng" rules={[{ required: true }]}>
              <Select placeholder="Chọn">
                <Select.Option value="A">A</Select.Option><Select.Option value="B">B</Select.Option>
                <Select.Option value="C">C</Select.Option><Select.Option value="D">D</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="explanation" label="Giải thích">
              <MathEditor placeholder="Giải thích đáp án..." rows={2} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
