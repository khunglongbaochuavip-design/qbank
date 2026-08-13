'use client';
import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, Tag, message, Alert, Space, Divider, Select } from 'antd';
import { DownloadOutlined, InboxOutlined, CheckCircleOutlined, ImportOutlined, ExportOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

export default function ImportExportPage() {
  const [preview, setPreview] = useState<{ batchId: string; totalRows: number; validCount: number; errorCount: number; preview: Record<string, unknown>[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [exportSubjectId, setExportSubjectId] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<string>('');
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/subjects').then(setSubjects).catch(console.error);
  }, []);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await api.upload('/questions/import/preview', formData) as { batchId: string; totalRows: number; validCount: number; errorCount: number; preview: Record<string, unknown>[] };
      setPreview(data);
      message.success(`Đã đọc ${data.totalRows} dòng. ${data.validCount} hợp lệ, ${data.errorCount} lỗi.`);
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setUploading(false); }
    return false; // prevent antd auto upload
  };

  const onConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const data = await api.post<{ imported: number; errors: number }>('/questions/import/confirm', { batchId: preview.batchId });
      message.success(`Đã nhập ${data.imported} câu hỏi thành công. ${data.errors} lỗi.`);
      setPreview(null);
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setConfirming(false); }
  };

  const onDownloadTemplate = () => { api.download('/questions/import/template', 'qbank_template.xlsx'); };

  const onExportQuestions = () => {
    const qs = new URLSearchParams();
    if (exportSubjectId) qs.set('subjectId', exportSubjectId);
    if (exportStatus) qs.set('status', exportStatus);
    api.download(`/questions/export?${qs}`, 'qbank_questions_export.xlsx');
  };

  const previewColumns = [
    { title: 'Dòng', dataIndex: 'row', width: 60 },
    { title: 'Trạng thái', dataIndex: 'valid', width: 100,
      render: (v: boolean) => v ? <Tag color="green">Hợp lệ</Tag> : <Tag color="red">Lỗi</Tag> },
    { title: 'Nội dung', dataIndex: ['data', 'questionText'], ellipsis: true },
    { title: 'Đáp án', dataIndex: ['data', 'correctOption'], width: 70 },
    { title: 'Lỗi', dataIndex: 'error', ellipsis: true, render: (v: string) => v ? <span style={{ color: 'red' }}>{v}</span> : null },
  ];

  return (
    <div>
      <div className="page-header"><h2><ImportOutlined /> Nhập / Xuất Câu hỏi Excel</h2></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Import Box */}
        <div className="content-card">
          <div className="content-card-title">📥 Nhập hàng loạt câu hỏi từ Excel</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert type="info" showIcon message="Cập nhật mới: Cột Mức độ khó hỗ trợ 5 mức (Rất dễ, Dễ, Trung bình, Khó, Rất khó hoặc Mã: VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD)" />
            <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate} type="primary" style={{ background: '#10b981' }}>
              Tải file Excel Mẫu (Có đính kèm trang Hướng dẫn)
            </Button>
            <Upload.Dragger beforeUpload={onUpload} accept=".xlsx,.xls" showUploadList={false} disabled={uploading}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc nhấn để chọn</p>
              <p className="ant-upload-hint">Chấp nhận file .xlsx hoặc .xls</p>
            </Upload.Dragger>
          </Space>
        </div>

        {/* Export Box */}
        <div className="content-card">
          <div className="content-card-title">📤 Xuất ngân hàng câu hỏi ra Excel</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <p style={{ color: '#666' }}>Lọc câu hỏi cần xuất ra file Excel (bao gồm đầy đủ 5 Mức độ khó, Thẻ Tags, Đáp án và Giải thích):</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Select placeholder="Tất cả môn học" style={{ flex: 1 }} allowClear value={exportSubjectId || undefined} onChange={v => setExportSubjectId(v || '')}>
                {subjects.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
              </Select>
              <Select placeholder="Tất cả trạng thái" style={{ flex: 1 }} allowClear value={exportStatus || undefined} onChange={v => setExportStatus(v || '')}>
                <Select.Option value="approved">Đã duyệt</Select.Option>
                <Select.Option value="pending_review">Chờ duyệt</Select.Option>
                <Select.Option value="draft">Nháp</Select.Option>
              </Select>
            </div>
            <Button type="primary" icon={<ExportOutlined />} onClick={onExportQuestions} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 8, fontWeight: 600, marginTop: 12 }}>
              Xuất câu hỏi ra Excel (.xlsx)
            </Button>
          </Space>
        </div>
      </div>

      {preview && (
        <div className="content-card">
          <div className="content-card-title">👁 Xem trước dữ liệu ({preview.totalRows} dòng)</div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message={`${preview.validCount} dòng hợp lệ, ${preview.errorCount} dòng lỗi`} />
          <Table dataSource={preview.preview} columns={previewColumns} rowKey="row" size="small" pagination={false} />
          <Divider />
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={onConfirm} loading={confirming}
            disabled={preview.validCount === 0} style={{ background: '#22c55e' }}>
            Xác nhận nhập {preview.validCount} câu hỏi
          </Button>
        </div>
      )}
    </div>
  );
}
