// src/pages/import-export/ImportExportPage.jsx
import React, { useState } from 'react';
import { Card, Button, Upload, Table, Tag, Alert, Progress, Space, Typography, Divider, Row, Col, message } from 'antd';
import { DownloadOutlined, UploadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../api/client';

const { Text, Title } = Typography;

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('qbank_token');
    window.open(`/api/import-export/template?token=${token}`, '_blank');
  };

  const handleExport = () => {
    const token = localStorage.getItem('qbank_token');
    window.open(`/api/import-export/export?token=${token}`, '_blank');
  };

  const handleImport = async (file) => {
    setImporting(true); setResults(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/import-export/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResults(res.data);
      if (res.data.imported > 0) {
        message.success(`Đã nhập ${res.data.imported} câu hỏi mới (trạng thái: Nháp).`);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Lỗi khi nhập file.');
    } finally { setImporting(false); }
    return false;
  };

  const errorColumns = [
    { title: 'Dòng', dataIndex: 'row', width: 80 },
    { title: 'Lỗi', dataIndex: 'error' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📥 Nhập / Xuất Excel</div>
          <div className="page-subtitle">Nhập câu hỏi từ file Excel hoặc xuất danh sách câu hỏi</div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Import */}
        <Col xs={24} lg={12}>
          <Card title="📤 Nhập câu hỏi từ Excel" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Alert
              message="Hướng dẫn"
              description={
                <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                  <li>Tải file mẫu Excel về</li>
                  <li>Điền thông tin câu hỏi theo đúng định dạng</li>
                  <li>Xem sheet "Tham khảo" để biết các mã hợp lệ</li>
                  <li>Tải file lên để nhập câu hỏi</li>
                  <li>Câu hỏi nhập vào sẽ có trạng thái <strong>Nháp</strong></li>
                </ol>
              }
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />

            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ marginBottom: 16 }} block>
              ⬇ Tải file mẫu Excel
            </Button>

            <Divider style={{ margin: '16px 0' }} />

            <Upload
              accept=".xlsx,.xls"
              beforeUpload={handleImport}
              showUploadList={false}
              disabled={importing}
            >
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={importing}
                block
                size="large"
              >
                {importing ? 'Đang nhập...' : 'Chọn file Excel để nhập'}
              </Button>
            </Upload>

            {results && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{results.imported}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Câu hỏi đã nhập</div>
                  </div>
                  <div style={{ background: '#fff1f0', borderRadius: 8, padding: '12px 20px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{results.errors.length}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Dòng có lỗi</div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div>
                    <Text strong style={{ color: '#ef4444', display: 'block', marginBottom: 8 }}>
                      <ExclamationCircleOutlined /> Chi tiết lỗi:
                    </Text>
                    <Table
                      dataSource={results.errors}
                      columns={errorColumns}
                      rowKey="row"
                      size="small"
                      pagination={false}
                      style={{ borderRadius: 8 }}
                    />
                  </div>
                )}

                {results.imported > 0 && (
                  <Alert
                    message={`Đã nhập thành công ${results.imported} câu hỏi vào ngân hàng. Chúng có trạng thái "Nháp" và cần được gửi để phê duyệt.`}
                    type="success"
                    showIcon
                    style={{ marginTop: 12, borderRadius: 8 }}
                  />
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* Export */}
        <Col xs={24} lg={12}>
          <Card title="📄 Xuất danh sách câu hỏi" bordered={false} style={{ borderRadius: 12, height: '100%' }}>
            <Alert
              message="Xuất toàn bộ câu hỏi bạn có quyền xem ra file Excel"
              description="File Excel sẽ bao gồm tất cả thông tin của câu hỏi: nội dung, lựa chọn, đáp án đúng, phân loại, độ khó, v.v."
              type="info"
              showIcon
              style={{ marginBottom: 20, borderRadius: 8 }}
            />

            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              type="primary"
              block
              size="large"
              style={{ background: '#22c55e', border: 'none' }}
            >
              ⬇ Xuất danh sách câu hỏi (Excel)
            </Button>

            <Divider style={{ margin: '24px 0' }} />

            <Title level={5} style={{ color: '#475569', marginBottom: 12 }}>File xuất sẽ bao gồm:</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Mã câu hỏi, môn học, lĩnh vực, chủ đề',
                'Khối lớp, mức độ nhận thức',
                'Độ khó ước tính, thực nghiệm, chính thức',
                'Nội dung câu hỏi và 4 lựa chọn',
                'Đáp án đúng và giải thích',
                'Trạng thái, người tạo, số lần sử dụng',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 14 }}>
                  <CheckCircleOutlined style={{ color: '#22c55e', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
