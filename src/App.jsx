import React from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import zhCN from 'antd/locale/zh_CN';
import {
  BarChartOutlined,
  DashboardOutlined,
  SettingOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined
} from '@ant-design/icons';
import Home from './pages/Home';
import About from './pages/About';
import Analysis from './pages/Analysis';
import Evaluation from './pages/Evaluation';
import Vulnerability from './pages/Vulnerability';
import Report from './pages/Report';
import Other from './pages/Other';
import './App.css';

const route = {
  path: '/',
  routes: [
    {
      path: '/',
      name: '前处理',
      icon: <DashboardOutlined />,
    },
    {
      path: '/analysis',
      name: '运行分析与结果',
      icon: <BarChartOutlined />,
    },
    {
      path: '/evaluation',
      name: '评估抗震性能',
      icon: <ExperimentOutlined />,
    },
    {
      path: '/vulnerability',
      name: '易损性规范管理',
      icon: <SettingOutlined />,
    },
    {
      path: '/report',
      name: '生成报告',
      icon: <FileTextOutlined />,
    },
    {
      path: '/other',
      name: '其他',
      icon: <SettingOutlined />,
    },
    {
      path: '/exit',
      name: '退出',
      icon: <LogoutOutlined />,
    },
  ],
};

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMinimize = () => {
    window.electron.ipcRenderer.send('window-minimize');
  };

  const handleMaximize = () => {
    window.electron.ipcRenderer.send('window-maximize');
  };

  const handleClose = () => {
    window.electron.ipcRenderer.send('window-close');
  };

  return (
    <div className="app-container">
      <div className="window-controls" >
        <button onClick={handleMinimize}><MinusOutlined /></button>
        <button onClick={handleMaximize}><BorderOutlined /></button>
        <button onClick={handleClose}><CloseOutlined /></button>
      </div>
      <ProLayout
        title="桥梁抗震性能评估"
        logo={null}
        route={route}
        location={{
          pathname: location.pathname,
        }}
        menuItemRender={(item, dom) => (
          <div
            onClick={() => {
              if (item.path === '/exit') {
                window.electron.ipcRenderer.send('window-close');
              } else {
                const path = item.path.startsWith('/') ? item.path : `/${item.path}`;
                console.log('Navigating to:', path);
                navigate(path);
              }
            }}
          >
            {dom}
          </div>
        )}
        layout="mix"
        fixSiderbar
        fixedHeader
        defaultCollapsed={false}
        collapsed={false}
        contentStyle={{
          margin: 0,
          padding: 0
        }}
      >
        <div style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/vulnerability" element={<Vulnerability />} />
            <Route path="/report" element={<Report />} />
            <Route path="/other" element={<Other />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </ProLayout>
    </div>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router basename="/">
        <AppLayout />
      </Router>
    </ConfigProvider>
  );
}

export default App; 