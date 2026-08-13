'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

const { TabPane } = Tabs;

// -------------------------------------------------------------
// MASTER DATA PAGE
// -------------------------------------------------------------
export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState('subjects');

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Quản lý Danh mục (Master Data)</h1>
      <Card className="glass-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Môn học" key="subjects">
            <SubjectManager />
          </TabPane>
          <TabPane tab="Lĩnh vực" key="domains">
            <DomainManager />
          </TabPane>
          <TabPane tab="Chủ đề" key="topics">
            <TopicManager />
          </TabPane>
          <TabPane tab="Khối lớp" key="grade-levels">
            <GenericManager type="grade-levels" title="Khối lớp" />
          </TabPane>
          <TabPane tab="Mức nhận thức" key="cognitive-levels">
            <GenericManager type="cognitive-levels" title="Mức nhận thức" />
          </TabPane>
          <TabPane tab="Mức độ khó" key="difficulty-levels">
            <DifficultyManager />
          </TabPane>
          <TabPane tab="Thẻ (Tags)" key="tags">
            <TagManager />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

// -------------------------------------------------------------
// SUBJECT MANAGER
// -------------------------------------------------------------
function SubjectManager() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/subjects');
      setData(Array.isArray(res) ? res : ((res as any).data || []));
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (values.sortOrder !== undefined && values.sortOrder !== null && values.sortOrder !== '') {
        values.sortOrder = parseInt(values.sortOrder.toString(), 10);
      } else {
        delete values.sortOrder;
      }
      if (editingId) {
        await api.patch(`/subjects/${editingId}`, values);
      } else {
        await api.post('/subjects', values);
      }
      message.success('Lưu thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lưu thất bại (Mã đã tồn tại hoặc lỗi dữ liệu)');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/subjects/${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên môn học', dataIndex: 'name', key: 'name' },
    { title: 'Sắp xếp', dataIndex: 'sortOrder', key: 'sortOrder' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title="Xóa môn học này hoàn toàn?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }} style={{ marginBottom: 16 }}>Thêm Môn học</Button>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? "Sửa Môn học" : "Thêm Môn học"} open={isModalVisible} onOk={() => form.submit()} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="code" label="Mã Môn học" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}><Input /></Form.Item>
          <Form.Item name="name" label="Tên Môn học" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp (tùy chọn)"><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// DOMAIN MANAGER
// -------------------------------------------------------------
function DomainManager() {
  const [data, setData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [domRes, subRes] = await Promise.all([
        api.get<any[]>('/domains'),
        api.get<any[]>('/subjects')
      ]);
      setData(Array.isArray(domRes) ? domRes : ((domRes as any).data || []));
      setSubjects(Array.isArray(subRes) ? subRes : ((subRes as any).data || []));
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải dữ liệu lĩnh vực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch(`/domains/${editingId}`, values);
      } else {
        await api.post('/domains', values);
      }
      message.success('Lưu thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/domains/${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên Lĩnh vực', dataIndex: 'name', key: 'name' },
    { title: 'Môn học', key: 'subject', render: (_: any, record: any) => subjects.find((s: any) => s.id === record.subjectId)?.name || 'Không rõ' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title="Xóa lĩnh vực này hoàn toàn?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }} style={{ marginBottom: 16 }}>Thêm Lĩnh vực</Button>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? "Sửa Lĩnh vực" : "Thêm Lĩnh vực"} open={isModalVisible} onOk={() => form.submit()} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="subjectId" label="Thuộc Môn học" rules={[{ required: true, message: 'Vui lòng chọn môn học' }]}>
            <Select>
              {subjects.map((s: any) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="code" label="Mã Lĩnh vực" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}><Input /></Form.Item>
          <Form.Item name="name" label="Tên Lĩnh vực" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// TOPIC MANAGER
// -------------------------------------------------------------
function TopicManager() {
  const [data, setData] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topRes, domRes] = await Promise.all([
        api.get<any[]>('/topics'),
        api.get<any[]>('/domains')
      ]);
      setData(Array.isArray(topRes) ? topRes : ((topRes as any).data || []));
      setDomains(Array.isArray(domRes) ? domRes : ((domRes as any).data || []));
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải dữ liệu chủ đề');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch(`/topics/${editingId}`, values);
      } else {
        await api.post('/topics', values);
      }
      message.success('Lưu thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/topics/${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên Chủ đề', dataIndex: 'name', key: 'name' },
    { title: 'Lĩnh vực', key: 'domain', render: (_: any, record: any) => domains.find((d: any) => d.id === record.domainId)?.name || 'Không rõ' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title="Xóa chủ đề này hoàn toàn?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }} style={{ marginBottom: 16 }}>Thêm Chủ đề</Button>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? "Sửa Chủ đề" : "Thêm Chủ đề"} open={isModalVisible} onOk={() => form.submit()} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="domainId" label="Thuộc Lĩnh vực" rules={[{ required: true, message: 'Vui lòng chọn lĩnh vực' }]}>
            <Select>
              {domains.map((d: any) => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="code" label="Mã Chủ đề" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}><Input /></Form.Item>
          <Form.Item name="name" label="Tên Chủ đề" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// DIFFICULTY MANAGER — Quản lý Mức độ khó
// -------------------------------------------------------------
const DEFAULT_DIFFICULTY_LEVELS = [
  { code: 'VERY_EASY', name: 'Rất dễ' },
  { code: 'EASY',      name: 'Dễ' },
  { code: 'MEDIUM',    name: 'Trung bình' },
  { code: 'HARD',      name: 'Khó' },
  { code: 'VERY_HARD', name: 'Rất khó' },
];

function DifficultyManager() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/master?type=difficulty-levels');
      setData(Array.isArray(res) ? res : ((res as any).data || []));
    } catch (err: any) {
      message.error(err.message || 'Không thể tải mức độ khó');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      for (const level of DEFAULT_DIFFICULTY_LEVELS) {
        try {
          await api.post('/master', { type: 'difficulty-levels', ...level });
        } catch {
          // Skip if already exists (unique constraint)
        }
      }
      message.success('Đã thêm 5 mức độ khó mặc định!');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Thêm mặc định thất bại');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch('/master', { type: 'difficulty-levels', id: editingId, ...values });
      } else {
        await api.post('/master', { type: 'difficulty-levels', ...values });
      }
      message.success(editingId ? 'Cập nhật thành công' : 'Thêm thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Thao tác thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/master?type=difficulty-levels&id=${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const diffRangeMap: Record<string, string> = {
    'VERY_EASY': '0.0 – 0.2',
    'EASY':      '0.2 – 0.4',
    'MEDIUM':    '0.4 – 0.6',
    'HARD':      '0.6 – 0.8',
    'VERY_HARD': '0.8 – 1.0',
  };
  const diffColorMap: Record<string, string> = {
    'VERY_EASY': 'green',
    'EASY':      'cyan',
    'MEDIUM':    'blue',
    'HARD':      'orange',
    'VERY_HARD': 'red',
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 120,
      render: (code: string) => <Tag color={diffColorMap[code] || 'default'}>{code}</Tag> },
    { title: 'Tên mức độ', dataIndex: 'name', key: 'name' },
    { title: 'Dải điểm', key: 'range',
      render: (_: any, record: any) => diffRangeMap[record.code] || `${record.minVal ?? '?'} – ${record.maxVal ?? '?'}` },
    {
      title: 'Thao tác', key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title="Xóa mức độ khó này hoàn toàn?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }}>Thêm Mức độ khó</Button>
        {data.length === 0 && (
          <Button loading={seeding} onClick={handleSeedDefaults} style={{ background: '#f0fdf4', borderColor: '#22c55e', color: '#15803d' }}>
            ✨ Tự động thêm 5 mức mặc định (Rất dễ → Rất khó)
          </Button>
        )}
      </Space>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? 'Sửa Mức độ khó' : 'Thêm Mức độ khó'} open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setEditingId(null); }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="code" label="Mã (Code)" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
            extra="Gợi ý: VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD (để tự động khớp dải điểm)">
            <Input placeholder="Ví dụ: VERY_EASY" />
          </Form.Item>
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Ví dụ: Rất dễ" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// GENERIC MANAGER — Khối lớp, Mức nhận thức
// -------------------------------------------------------------
function GenericManager({ type, title }: { type: string; title: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>(`/master?type=${type}`);
      setData(Array.isArray(res) ? res : ((res as any).data || []));
    } catch (err: any) {
      console.error(err);
      message.error(err.message || `Không thể tải dữ liệu ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [type]);

  const handleSave = async (values: any) => {
    try {
      if (values.sortOrder !== undefined && values.sortOrder !== null && values.sortOrder !== '') {
        values.sortOrder = parseInt(values.sortOrder.toString(), 10);
      } else {
        delete values.sortOrder;
      }
      if (editingId) {
        await api.patch('/master', { type, id: editingId, ...values });
      } else {
        await api.post('/master', { type, ...values });
      }
      message.success(editingId ? 'Cập nhật thành công' : 'Thêm thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Thao tác thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/master?type=${type}&id=${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: `Tên ${title}`, dataIndex: 'name', key: 'name' },
    { title: 'Sắp xếp', dataIndex: 'sortOrder', key: 'sortOrder' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue(record); setIsModalVisible(true); }} />
          <Popconfirm title={`Xóa ${title.toLowerCase()} này hoàn toàn?`} onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }} style={{ marginBottom: 16 }}>Thêm {title}</Button>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? `Sửa ${title}` : `Thêm ${title}`} open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setEditingId(null); }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Vui lòng nhập mã' }]}><Input /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp (tùy chọn)"><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// -------------------------------------------------------------
// TAG MANAGER — simple name-based tags
// -------------------------------------------------------------
function TagManager() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/master?type=tags');
      setData(Array.isArray(res) ? res : ((res as any).data || []));
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Không thể tải danh sách thẻ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editingId) {
        await api.patch('/master', { type: 'tags', id: editingId, name: values.name });
      } else {
        await api.post('/master', { type: 'tags', name: values.name });
      }
      message.success(editingId ? 'Cập nhật thành công' : 'Thêm thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Thao tác thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.del(`/master?type=tags&id=${id}`);
      message.success('Xóa thành công');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Tên Tag', dataIndex: 'name', key: 'name' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingId(record.id); form.setFieldsValue({ name: record.name }); setIsModalVisible(true); }} />
          <Popconfirm title="Xóa tag này hoàn toàn?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setIsModalVisible(true); }} style={{ marginBottom: 16 }}>Thêm Tag</Button>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingId ? "Sửa Tag" : "Thêm Tag"} open={isModalVisible} onOk={() => form.submit()} onCancel={() => { setIsModalVisible(false); setEditingId(null); }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên Tag" rules={[{ required: true, message: 'Vui lòng nhập tên tag' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
