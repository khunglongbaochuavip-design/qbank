// src/pages/questions/QuestionFormPage.jsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Row, Col, Space, Tag, Upload, message, Radio, Divider, Alert, Spin, Typography, Breadcrumb } from 'antd';
import { UploadOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useMasterData } from '../../hooks/useMasterData';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

export default function QuestionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const master = useMasterData();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [filteredDomains, setFilteredDomains] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);

  useEffect(() => {
    if (isEdit) {
      api.get(`/questions/${id}`)
        .then(res => {
          setQuestion(res.data);
          setImageUrl(res.data.questionImage);
          form.setFieldsValue({
            ...res.data,
            tagIds: res.data.questionTags?.map(qt => qt.tagId),
            subjectId: res.data.subjectId,
            domainId: res.data.domainId,
            topicId: res.data.topicId,
            gradeLevelId: res.data.gradeLevelId,
            cognitiveLevelId: res.data.cognitiveLevelId,
          });
          if (res.data.subjectId) filterDomains(res.data.subjectId);
          if (res.data.domainId) filterTopics(res.data.domainId);
        })
        .catch(() => message.error('Không thể tải câu hỏi.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const filterDomains = (subjectId) => {
    setFilteredDomains(master.domains.filter(d => d.subjectId === subjectId));
    form.setFieldsValue({ domainId: null, topicId: null });
    setFilteredTopics([]);
  };

  const filterTopics = (domainId) => {
    setFilteredTopics(master.topics.filter(t => t.domainId === domainId));
    form.setFieldsValue({ topicId: null });
  };

  const handleSave = async (submitForReview = false) => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (submitForReview) values.status = 'draft';

      let savedQuestion;
      if (isEdit) {
        const res = await api.put(`/questions/${id}`, values);
        savedQuestion = res.data;
        message.success('Đã cập nhật câu hỏi.');
      } else {
        const res = await api.post('/questions', values);
        savedQuestion = res.data;
        message.success('Đã tạo câu hỏi.');
      }

      if (submitForReview) {
        await api.post(`/questions/${savedQuestion.id}/submit`);
        message.success('Đã gửi để phê duyệt.');
      }
      navigate('/questions');
    } catch (err) {
      if (err?.errorFields) return; // Ant Design validation error
      message.error(err.response?.data?.error || 'Có lỗi xảy ra.');
    } finally { setSaving(false); }
  };

  const handleImageUpload = async (file) => {
    const questionId = id || question?.id;
    if (!questionId) {
      message.warning('Hãy lưu câu hỏi trước khi tải ảnh.');
      return false;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post(`/questions/${questionId}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(res.data.imageUrl);
      message.success('Tải ảnh thành công.');
    } catch { message.error('Tải ảnh thất bại.'); }
    return false; // Prevent default upload
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  const canSubmit = user.role === 'teacher' || user.role === 'super_admin' || user.role === 'academic_admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb items={[{ title: <a onClick={() => navigate('/questions')}>Câu hỏi</a> }, { title: isEdit ? 'Chỉnh sửa' : 'Tạo mới' }]} style={{ marginBottom: 8 }} />
          <div className="page-title">{isEdit ? '✏️ Chỉnh sửa câu hỏi' : '➕ Tạo câu hỏi mới'}</div>
          {isEdit && <div className="page-subtitle">Mã: <Text code>{question?.questionCode}</Text></div>}
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')}>Quay lại</Button>
          <Button icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving}>Lưu nháp</Button>
          {canSubmit && (
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSave(true)} loading={saving}>
              Lưu & Gửi phê duyệt
            </Button>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" size="middle">
        <Row gutter={[16, 0]}>
          {/* Left: classification */}
          <Col xs={24} lg={8}>
            <Card title="📌 Phân loại câu hỏi" bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
              <Form.Item name="subjectId" label="Môn học">
                <Select placeholder="Chọn môn học" allowClear onChange={filterDomains}>
                  {master.subjects.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="domainId" label="Lĩnh vực">
                <Select placeholder="Chọn lĩnh vực" allowClear onChange={filterTopics} disabled={!filteredDomains.length && !master.domains.length}>
                  {(filteredDomains.length ? filteredDomains : master.domains).map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="topicId" label="Chủ đề">
                <Select placeholder="Chọn chủ đề" allowClear>
                  {(filteredTopics.length ? filteredTopics : master.topics).map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="gradeLevelId" label="Khối lớp">
                <Select placeholder="Chọn khối lớp" allowClear>
                  {master.gradeLevels.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="cognitiveLevelId" label="Mức độ nhận thức">
                <Select placeholder="Chọn mức nhận thức" allowClear>
                  {master.cognitiveLevels.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="estimatedDifficulty" label="Độ khó ước tính (0 ~ 1)" initialValue={0.5}>
                <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }}
                  formatter={v => `${(v * 100).toFixed(0)}%`}
                  parser={v => parseFloat(v) / 100}
                />
              </Form.Item>
              <Form.Item name="sourceReference" label="Nguồn tham khảo">
                <Input placeholder="VD: SGK Toán 10, trang 56" />
              </Form.Item>
              <Form.Item name="tagIds" label="Tags">
                <Select mode="multiple" placeholder="Chọn tags" allowClear>
                  {master.tags.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </Card>

            {/* Image */}
            <Card title={<span><PictureOutlined /> Hình ảnh câu hỏi</span>} bordered={false} style={{ borderRadius: 12 }}>
              {imageUrl && (
                <img src={imageUrl} alt="Question" style={{ width: '100%', borderRadius: 8, marginBottom: 12, border: '1px solid #f0f0f0' }} />
              )}
              <Upload beforeUpload={handleImageUpload} accept="image/*" showUploadList={false}>
                <Button icon={<UploadOutlined />} block>{imageUrl ? 'Thay ảnh' : 'Tải ảnh lên'}</Button>
              </Upload>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8, display: 'block' }}>JPG, PNG, GIF, WebP • Tối đa 5MB</Text>
            </Card>
          </Col>

          {/* Right: question content */}
          <Col xs={24} lg={16}>
            <Card title="📝 Nội dung câu hỏi" bordered={false} style={{ borderRadius: 12 }}>
              <Form.Item name="contextText" label="Dẫn ngữ / Ngữ cảnh (tuỳ chọn)">
                <TextArea rows={3} placeholder="Nhập đoạn văn hoặc bảng số liệu làm ngữ cảnh cho câu hỏi..." />
              </Form.Item>

              <Form.Item
                name="questionText"
                label="Câu hỏi *"
                rules={[{ required: true, message: 'Vui lòng nhập nội dung câu hỏi.' }]}
              >
                <TextArea rows={4} placeholder="Nhập câu hỏi ở đây..." />
              </Form.Item>

              <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>Các lựa chọn</Divider>

              <Form.Item
                name="correctOption"
                label="Đáp án đúng"
                rules={[{ required: true, message: 'Chọn đáp án đúng.' }]}
                initialValue="A"
              >
                <Radio.Group>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <Radio.Button key={opt} value={opt} style={{ fontWeight: 700 }}>{opt}</Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>

              {['A', 'B', 'C', 'D'].map(opt => (
                <Form.Item
                  key={opt}
                  name={`option${opt}`}
                  label={`Lựa chọn ${opt}`}
                  rules={[{ required: true, message: `Nhập nội dung lựa chọn ${opt}.` }]}
                >
                  <Input
                    prefix={<span style={{ fontWeight: 700, color: '#3b82f6', minWidth: 20 }}>{opt}.</span>}
                    placeholder={`Nội dung lựa chọn ${opt}...`}
                  />
                </Form.Item>
              ))}

              <Divider orientation="left" style={{ color: '#64748b', fontSize: 13 }}>Giải thích & Ghi chú</Divider>

              <Form.Item name="explanation" label="Giải thích đáp án">
                <TextArea rows={3} placeholder="Giải thích tại sao đáp án đó là đúng..." />
              </Form.Item>

              <Form.Item name="notes" label="Ghi chú nội bộ">
                <TextArea rows={2} placeholder="Ghi chú cho người dùng nội bộ (không hiển thị với học sinh)..." />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
