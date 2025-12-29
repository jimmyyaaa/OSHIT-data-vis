import { BrowserRouter as Router, useRoutes } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { routes } from '@/router';

function AppRoutes() {
  return useRoutes([
    {
      element: <MainLayout />,
      children: routes,
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
