// src/pages/matrices/MatrixFormPage.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Space, Table, Tag, message, Spin, Typography, Breadcrumb, Popconfirm, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useMasterData } from '../../hooks/useMasterData';

const { Option } = Select;
const { Text } = Typography;

export default function MatrixFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const master = useMasterData();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [cells, setCells] = useState([]);
  const [availability, setAvailability] = useState({});
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/matrices/${id}`)
        .then(res => {
          form.setFieldsValue({ name: res.data.name, description: res.data.description, subjectId: res.data.subjectId });
          setCells(res.data.cells.map((c, i) => ({ ...c, _key: i })));
        })
        .catch(() => message.error('Không thể tải ma trận.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const addCell = () => {
    setCells(prev => [...prev, { _key: Date.now(), domainId: null, topicId: null, cognitiveLevelId: null, difficultyLevelId: null, requiredCount: 1 }]);
  };

  const removeCell = (key) => setCells(prev => prev.filter(c => c._key !== key));

  const updateCell = (key, field, value) => {
    setCells(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (cells.length === 0) { message.warning('Hãy thêm ít nhất một ô trong ma trận.'); return; }
      setSaving(true);
      const payload = { ...values, cells };
      if (isEdit) {
        await api.put(`/matrices/${id}`, payload);
        message.success('Đã cập nhật ma trận.');
      } else {
        await api.post('/matrices', payload);
        message.success('Đã tạo ma trận mới.');
      }
      navigate('/matrices');
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.error || 'Lỗi khi lưu.');
    } finally { setSaving(false); }
  };

  const checkAvailability = async () => {
    if (!isEdit) { message.info('Lưu ma trận trước khi kiểm tra số lượng câu hỏi.'); return; }
    setCheckingAvail(true);
    try {
      const res = await api.post(`/matrices/${id}/check-availability`);
      const avMap = {};
      res.data.forEach(c => { avMap[c.id] = c; });
      setAvailability(avMap);
    } catch { message.error('Lỗi kiểm tra.'); }
    finally { setCheckingAvail(false); }
  };

  const totalRequired = cells.reduce((s, c) => s + (Number(c.requiredCount) || 0), 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb items={[{ title: <a onClick={() => navigate('/matrices')}>Ma trận</a> }, { title: isEdit ? 'Chỉnh sửa' : 'Tạo mới' }]} style={{ marginBottom: 8 }} />
          <div className="page-title">{isEdit ? '✏️ Chỉnh sửa ma trận' : '➕ Tạo ma trận mới'}</div>
          <div className="page-subtitle">Tổng số câu yêu cầu: <Text strong>{totalRequired}</Text></div>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/matrices')}>Quay lại</Button>
          {isEdit && <Button onClick={checkAvailability} loading={checkingAvail} icon={<CheckCircleOutlined />}>Kiểm tra số lượng</Button>}
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>Lưu ma trận</Button>
        </Space>
      </div>

      <Card title="Thông tin ma trận" bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên ma trận" rules={[{ required: true, message: 'Nhập tên ma trận.' }]}>
            <Input placeholder="VD: Ma trận đề kiểm tra Toán 10 - HK1" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về đề thi..." />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn học">
            <Select placeholder="Chọn môn học" allowClear style={{ maxWidth: 300 }}>
              {master.subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={<span>📋 Các ô trong ma trận ({cells.length} ô)</span>}
        bordered={false}
        style={{ borderRadius: 12 }}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={addCell}>Thêm ô</Button>}
      >
        {cells.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>Chưa có ô nào. Nhấn "Thêm ô" để bắt đầu thiết kế ma trận.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['STT', 'Lĩnh vực', 'Chủ đề', 'Mức nhận thức', 'Mức độ khó', 'Số câu *', 'Sẵn sàng', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#475569', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells.map((cell, idx) => {
                  const avail = availability[cell.id];
                  return (
                    <tr key={cell._key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 13 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', minWidth: 160 }}>
                        <Select size="small" placeholder="Lĩnh vực" value={cell.domainId} style={{ width: '100%' }} allowClear onChange={v => updateCell(cell._key, 'domainId', v)}>
                          {master.domains.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 160 }}>
                        <Select size="small" placeholder="Chủ đề" value={cell.topicId} style={{ width: '100%' }} allowClear onChange={v => updateCell(cell._key, 'topicId', v)}>
                          {master.topics.filter(t => !cell.domainId || t.domainId === cell.domainId).map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 140 }}>
                        <Select size="small" placeholder="Mức nhận thức" value={cell.cognitiveLevelId} style={{ width: '100%' }} allowClear onChange={v => updateCell(cell._key, 'cognitiveLevelId', v)}>
                          {master.cognitiveLevels.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 120 }}>
                        <Select size="small" placeholder="Độ khó" value={cell.difficultyLevelId} style={{ width: '100%' }} allowClear onChange={v => updateCell(cell._key, 'difficultyLevelId', v)}>
                          {master.difficultyLevels.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: '8px 12px', width: 90 }}>
                        <InputNumber
                          size="small"
                          min={1}
                          max={50}
                          value={cell.requiredCount}
                          onChange={v => updateCell(cell._key, 'requiredCount', v)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', width: 110 }}>
                        {avail ? (
                          <Tag color={avail.sufficient ? 'green' : 'red'} icon={avail.sufficient ? <CheckCircleOutlined /> : <WarningOutlined />}>
                            {avail.availableCount}/{cell.requiredCount}
                          </Tag>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Popconfirm title="Xóa ô này?" onConfirm={() => removeCell(cell._key)} okText="Xóa" cancelText="Hủy">
                          <Button size="small" icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ margin: '16px 0 8px', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#64748b' }}>Tổng số câu hỏi cần:</Text>
              <Text strong style={{ fontSize: 18 }}>{totalRequired}</Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
