/**
 * 路由配置
 * 定义所有页面的路由
 */

import type { RouteObject } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import LoginPage from '@/pages/Login';
import StakingPage from '@/pages/Statistics/Staking';
import TSPage from '@/pages/Statistics/TS';
import POSPage from '@/pages/Statistics/POS';
import ShitCodePage from '@/pages/Statistics/ShitCode';
import RevenuePage from '@/pages/Statistics/Revenue';
import DeFiPage from '@/pages/Statistics/DeFi';
import AnomalyPage from '@/pages/Anomaly';
import NotFound from '@/pages/NotFound';

export const routes: RouteObject[] = [
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: <Dashboard />,
    },
    {
        path: '/dashboard',
        element: <Dashboard />,
    },
    {
        path: '/anomalies',
        element: <AnomalyPage />,
    },
    {
        path: '/statistics/staking',
        element: <StakingPage />,
    },
    {
        path: '/statistics/ts',
        element: <TSPage />,
    },
    {
        path: '/statistics/pos',
        element: <POSPage />,
    },
    {
        path: '/statistics/shitcode',
        element: <ShitCodePage />,
    },
    {
        path: '/statistics/revenue',
        element: <RevenuePage />,
    },
    {
        path: '/statistics/defi',
        element: <DeFiPage />,
    },
    {
        path: '*',
        element: <NotFound />,
    },
];
