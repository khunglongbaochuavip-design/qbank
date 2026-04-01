// src/layouts/AppLayout.jsx
import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Tooltip } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  CheckSquareOutlined,
  ImportOutlined,
  TableOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, canManageUsers, canManageSettings } from '../utils/constants';

const { Sider, Header, Content } = Layout;

const ROLE_COLORS = {
  super_admin: '#ef4444',
  academic_admin: '#3b82f6',
  teacher: '#22c55e',
  exam_creator: '#f59e0b',
  student: '#8b5cf6',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) { navigate('/login'); return null; }

  // Build sidebar nav items based on role
  const navItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
  ];

  if (user.role !== 'student') {
    navItems.push({ key: '/questions', icon: <BookOutlined />, label: 'Ngân hàng câu hỏi' });
  }

  if (['super_admin', 'academic_admin'].includes(user.role)) {
    navItems.push({ key: '/review', icon: <CheckSquareOutlined />, label: 'Hàng chờ phê duyệt' });
  }

  if (['super_admin', 'academic_admin', 'teacher'].includes(user.role)) {
    navItems.push({ key: '/import-export', icon: <ImportOutlined />, label: 'Nhập / Xuất Excel' });
  }

  if (['super_admin', 'academic_admin', 'exam_creator'].includes(user.role)) {
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
    navItems.push({ key: '/users', icon: <TeamOutlined />, label: 'Người dùng' });
  }

  if (canManageSettings(user.role)) {
    navItems.push({ key: '/settings', icon: <SettingOutlined />, label: 'Cài đặt hệ thống' });
  }

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', disabled: true },
    { key: 'changePassword', icon: <LockOutlined />, label: 'Đổi mật khẩu' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') { logout(); navigate('/login'); }
    if (key === 'changePassword') navigate('/change-password');
  };

  const selectedKey = navItems.find(i => location.pathname.startsWith(i.key))?.key || '/dashboard';

  return (
    <Layout className="app-layout">
      <Sider
        className="app-sider"
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={240}
        collapsedWidth={64}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
          <div className="sidebar-logo-icon">📚</div>
          {!collapsed && (
            <div>
              <div className="sidebar-logo-text">QBank</div>
              <div className="sidebar-logo-sub">Ngân hàng câu hỏi</div>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, overflowY: 'auto' }}
        />

        {!collapsed && (
          <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, textAlign: 'center' }}>
              Bản quyền thuộc về Hữu Tài Genz<br/>Mọi thông tin xin liên hệ:<br/>Zalo 0902155906
            </div>
          </div>
        )}
      </Sider>

      <Layout>
        <Header className="app-header">
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div className="header-user">
                <Avatar
                  size={34}
                  style={{ background: ROLE_COLORS[user.role] || '#1677ff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
                >
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

        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
