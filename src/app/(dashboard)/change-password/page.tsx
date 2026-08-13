'use client';
import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api } from '@/lib/api-client';

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      return message.error('Mật khẩu mới không khớp!');
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      message.success('Đổi mật khẩu thành công!');
      form.resetFields();
    } catch (err: unknown) { message.error((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h2><LockOutlined /> Đổi mật khẩu</h2></div>
      <div className="content-card" style={{ maxWidth: 450 }}>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>Đổi mật khẩu</Button>
        </Form>
      </div>
    </div>
  );
}
