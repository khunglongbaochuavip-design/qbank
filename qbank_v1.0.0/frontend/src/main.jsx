// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={viVN}
    theme={{
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: '#4f46e5',
        colorSuccess: '#22c55e',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        colorInfo: '#3b82f6',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      components: {
        Layout: {
          siderBg: '#0f172a',
          headerBg: '#ffffff',
          triggerBg: '#1e293b',
        },
        Menu: {
          darkItemBg: '#0f172a',
          darkSubMenuItemBg: '#1e293b',
          darkItemSelectedBg: '#4f46e5',
          darkItemColor: '#94a3b8',
          darkItemHoverColor: '#f1f5f9',
        },
      },
    }}
  >
    <App />
  </ConfigProvider>
);
