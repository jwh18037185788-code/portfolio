import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router';
import './assets/styles/globals.css';

const App: React.FC = () => {
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  );
};

export default App;