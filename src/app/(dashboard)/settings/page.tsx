'use client';
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message, Divider } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ key: string; value: string }[]>('/settings').then((settings) => {
      const vals: Record<string, string> = {};
      settings.forEach(s => { vals[s.key] = s.value; });
      form.setFieldsValue(vals);
    });
  }, []);

  const onSave = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      await api.post('/settings', { settings: values });
      message.success('Đã lưu cài đặt.');
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h2><SettingOutlined /> Cài đặt Hệ thống</h2></div>
      <div className="content-card" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="app_name" label="Tên ứng dụng"><Input placeholder="QBank" /></Form.Item>
          <Form.Item name="school_name" label="Tên trường"><Input placeholder="Trường THPT..." /></Form.Item>
          <Form.Item name="default_exam_duration" label="Thời lượng thi mặc định (phút)"><Input type="number" placeholder="45" /></Form.Item>
          <Form.Item name="max_attempts" label="Số lần thi tối đa"><Input type="number" placeholder="1" /></Form.Item>
          <Divider />
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave} loading={loading}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>Lưu cài đặt</Button>
        </Form>
      </div>
    </div>
  );
}
