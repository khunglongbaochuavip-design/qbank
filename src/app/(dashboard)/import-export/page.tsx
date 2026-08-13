'use client';
import React, { useState } from 'react';
import { Upload, Button, Table, Tag, message, Alert, Space, Divider } from 'antd';
import { UploadOutlined, DownloadOutlined, InboxOutlined, CheckCircleOutlined, ImportOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

export default function ImportExportPage() {
  const [preview, setPreview] = useState<{ batchId: string; totalRows: number; validCount: number; errorCount: number; preview: Record<string, unknown>[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
      message.success(`Đã nhập ${data.imported} câu hỏi. ${data.errors} lỗi.`);
      setPreview(null);
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setConfirming(false); }
  };

  const onDownloadTemplate = () => { api.download('/questions/import/template', 'qbank_template.xlsx'); };

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
      <div className="page-header"><h2><ImportOutlined /> Nhập / Xuất Câu hỏi</h2></div>

      <div className="content-card">
        <div className="content-card-title">📥 Nhập câu hỏi từ Excel</div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>Tải mẫu Excel</Button>
          <Upload.Dragger beforeUpload={onUpload} accept=".xlsx,.xls" showUploadList={false} disabled={uploading}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc nhấn để chọn</p>
            <p className="ant-upload-hint">Chấp nhận file .xlsx hoặc .xls</p>
          </Upload.Dragger>
        </Space>
      </div>

      {preview && (
        <div className="content-card">
          <div className="content-card-title">👁 Xem trước dữ liệu</div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message={`${preview.validCount} dòng hợp lệ, ${preview.errorCount} dòng lỗi (tổng ${preview.totalRows})`} />
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
