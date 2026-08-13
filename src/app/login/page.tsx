'use client';
import React, { useState } from 'react';
import { Form, Input, Button, message, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Đăng nhập thành công!');
      router.push('/dashboard');
    } catch (err: unknown) {
      message.error((err as Error).message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📚</div>
          <h1>QBank</h1>
          <p>Hệ thống Ngân hàng Câu hỏi</p>
        </div>
        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập email!' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ height: 48, borderRadius: 12, fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#3b82f6', borderRadius: 10, fontFamily: 'Inter, sans-serif' } }}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </ConfigProvider>
  );
}
