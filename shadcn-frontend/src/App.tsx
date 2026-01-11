import { BrowserRouter as Router, useRoutes } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { routes } from '@/router';
import LoginPage from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AppRoutes() {
    // 分离登录页面和其他需要布局的页面
    const layoutRoutes = routes.filter(route => route.path !== '/login');

    return useRoutes([
        {
            path: '/login',
            element: <LoginPage />,
        },
        {
            element: (
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            ),
            children: layoutRoutes,
        },
    ]);
}

function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}

export default App;
