'use client';
import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, ConfigProvider, Spin } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import {
  DashboardOutlined, BookOutlined, CheckSquareOutlined, ImportOutlined,
  TableOutlined, FileTextOutlined, PlayCircleOutlined, BarChartOutlined,
  TeamOutlined, SettingOutlined, LogoutOutlined, LockOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { ROLE_LABELS, ROLE_COLORS, canManageUsers, canManageSettings, canManageQuestions, canReviewQuestions, canManageExams, canImportQuestions } from '@/lib/constants';

const { Sider, Header, Content } = Layout;

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Đang tải..." /></div>;
  if (!user) { router.push('/login'); return null; }

  const navItems: { key: string; icon: React.ReactNode; label: string }[] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
  ];

  if (canManageQuestions(user.role)) {
    navItems.push({ key: '/questions', icon: <BookOutlined />, label: 'Ngân hàng câu hỏi' });
  }
  if (canReviewQuestions(user.role)) {
    navItems.push({ key: '/review', icon: <CheckSquareOutlined />, label: 'Hàng chờ phê duyệt' });
  }
  if (canImportQuestions(user.role) || user.role === 'teacher') {
    navItems.push({ key: '/import-export', icon: <ImportOutlined />, label: 'Nhập / Xuất Excel' });
  }
  if (canManageExams(user.role)) {
    navItems.push(
      { key: '/matrices', icon: <TableOutlined />, label: 'Ma trận đề thi' },
      { key: '/exams', icon: <FileTextOutlined />, label: 'Đề thi' },
      { key: '/sessions', icon: <PlayCircleOutlined />, label: 'Phiên thi trực tuyến' },
      { key: '/results', icon: <BarChartOutlined />, label: 'Kết quả & Phân tích' },
    );
  }
  if (user.role === 'student') {
    navItems.push(
      { key: '/my-exams', icon: <PlayCircleOutlined />, label: 'Bài thi của tôi' },
      { key: '/my-results', icon: <BarChartOutlined />, label: 'Kết quả của tôi' },
    );
  }
  if (canManageUsers(user.role)) {
    navItems.push(
      { key: '/master', icon: <AppstoreOutlined />, label: 'Danh mục hệ thống' },
      { key: '/users', icon: <TeamOutlined />, label: 'Quản lý người dùng' }
    );
  }
  if (canManageSettings(user.role)) {
    navItems.push({ key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt hệ thống' });
  }

  const userMenuItems = [
    { key: 'changePassword', icon: <LockOutlined />, label: 'Đổi mật khẩu' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') { logout(); router.push('/login'); }
    if (key === 'changePassword') router.push('/change-password');
  };

  const selectedKey = navItems.find(i => pathname.startsWith(i.key))?.key || '/dashboard';

  return (
    <Layout className="app-layout">
      <Sider className="app-sider" collapsible collapsed={collapsed} trigger={null} width={240} collapsedWidth={64}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
        <div className="sidebar-logo" onClick={() => router.push('/dashboard')}>
          <div className="sidebar-logo-icon">📚</div>
          {!collapsed && <div><div className="sidebar-logo-text">QBank</div><div className="sidebar-logo-sub">Ngân hàng câu hỏi</div></div>}
        </div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={navItems} onClick={({ key }) => router.push(key)}
          style={{ flex: 1, overflowY: 'auto' }} />
        {!collapsed && (
          <div className="sidebar-footer"><strong>QBank Hữu Tài Genz</strong><br/>Bản quyền © 2026<br/>Liên hệ: Zalo 0902155906</div>
        )}
      </Sider>
      <Layout>
        <Header className="app-header">
          <div onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer', fontSize: 18, color: '#64748b' }}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div className="header-user">
                <Avatar size={34} style={{ background: ROLE_COLORS[user.role] || '#3b82f6', fontWeight: 700, fontSize: 15 }}>
                  {user.fullName?.charAt(0)}
                </Avatar>
                <div style={{ lineHeight: 1.3 }}>
                  <div className="header-user-name">{user.fullName}</div>
                  <div className="header-user-role">{ROLE_LABELS[user.role]}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={{
      token: { colorPrimary: '#3b82f6', borderRadius: 10, fontFamily: 'Inter, sans-serif' },
      components: { Table: { borderRadius: 12 }, Card: { borderRadius: 12 } },
    }}>
      <AuthProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </AuthProvider>
    </ConfigProvider>
  );
}
