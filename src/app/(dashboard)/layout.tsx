'use client';
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, ConfigProvider, Spin, Button } from 'antd';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      {/* Mobile backdrop when sidebar drawer is open */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 99 }}
        />
      )}
      <Sider
        className="app-sider"
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={isMobile ? 0 : 64}
        style={
          isMobile
            ? { position: 'fixed', left: 0, top: 0, bottom: 0, height: '100vh', zIndex: 100, overflow: 'auto' }
            : { position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }
        }
      >
        <div className="sidebar-logo" onClick={() => { router.push(user.role === 'student' ? '/my-exams' : '/dashboard'); if (isMobile) setCollapsed(true); }}>
          <div className="sidebar-logo-icon">📚</div>
          {!collapsed && <div><div className="sidebar-logo-text">QBank</div><div className="sidebar-logo-sub">Ngân hàng câu hỏi</div></div>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => {
            router.push(key);
            if (isMobile) setCollapsed(true);
          }}
          style={{ flex: 1, overflowY: 'auto' }}
        />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer', fontSize: 18, color: '#64748b', padding: '4px 6px' }}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            {user.role === 'student' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  size="small"
                  type={pathname.startsWith('/my-exams') ? 'primary' : 'default'}
                  icon={<PlayCircleOutlined />}
                  onClick={() => router.push('/my-exams')}
                >
                  Bài thi
                </Button>
                <Button
                  size="small"
                  type={pathname.startsWith('/my-results') ? 'primary' : 'default'}
                  icon={<BarChartOutlined />}
                  onClick={() => router.push('/my-results')}
                >
                  Kết quả
                </Button>
              </div>
            )}
          </div>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div className="header-user">
                <Avatar size={32} style={{ background: ROLE_COLORS[user.role] || '#3b82f6', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {user.fullName?.charAt(0)}
                </Avatar>
                {!isMobile && (
                  <div style={{ lineHeight: 1.3 }}>
                    <div className="header-user-name">{user.fullName}</div>
                    <div className="header-user-role">{ROLE_LABELS[user.role]}</div>
                  </div>
                )}
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
