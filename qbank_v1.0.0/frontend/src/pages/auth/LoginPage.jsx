// src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const DEMO_ACCOUNTS = [
  { label: 'Quản trị viên', email: 'superadmin@qbank.edu.vn', role: 'super_admin' },
  { label: 'Quản lý học thuật', email: 'admin@qbank.edu.vn', role: 'academic_admin' },
  { label: 'Giáo viên', email: 'giaovien1@qbank.edu.vn', role: 'teacher' },
  { label: 'Xây dựng đề thi', email: 'khao.thi@qbank.edu.vn', role: 'exam_creator' },
  { label: 'Học sinh', email: 'hocsinh1@qbank.edu.vn', role: 'student' },
];

const ROLE_COLORS = {
  super_admin: '#ef4444', academic_admin: '#3b82f6',
  teacher: '#22c55e', exam_creator: '#f59e0b', student: '#8b5cf6',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setLoading(true); setError('');
    try {
      const user = await login(values.email, values.password);
      navigate(user.role === 'student' ? '/my-exams' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  const fillDemo = (email) => {
    form.setFieldsValue({ email, password: 'password123' });
  };

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="login-bg-blob" style={{ width: 400, height: 400, background: '#3b82f6', top: -100, left: -100 }} />
      <div className="login-bg-blob" style={{ width: 300, height: 300, background: '#8b5cf6', bottom: -80, right: -80 }} />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">📚</div>
          <div>
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>QBank</Title>
            <Text style={{ color: '#64748b', fontSize: 13 }}>Hệ thống Quản lý Ngân hàng Câu hỏi</Text>
          </div>
        </div>

        <Title level={4} style={{ margin: '0 0 24px', color: '#0f172a' }}>Đăng nhập</Title>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}

        <Form form={form} onFinish={handleSubmit} layout="vertical" requiredMark={false} size="large">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}>
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="email@truong.edu.vn" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Mật khẩu" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ height: 48, borderRadius: 10, fontSize: 16, fontWeight: 600, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', border: 'none' }}>
            Đăng nhập
          </Button>
        </Form>

        {/* Demo accounts quick login */}
        <div style={{ marginTop: 28, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tài khoản demo (mật khẩu: password123)
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc.email)}
                style={{
                  padding: '5px 12px',
                  border: `1.5px solid ${ROLE_COLORS[acc.role]}22`,
                  borderRadius: 6,
                  background: `${ROLE_COLORS[acc.role]}10`,
                  color: ROLE_COLORS[acc.role],
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.target.style.background = `${ROLE_COLORS[acc.role]}20`}
                onMouseLeave={e => e.target.style.background = `${ROLE_COLORS[acc.role]}10`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Copyright Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>
            Bản quyền thuộc về Hữu Tài Genz, mọi thông tin xin liên hệ: Zalo 0902155906
          </Text>
        </div>
      </div>
    </div>
  );
}
