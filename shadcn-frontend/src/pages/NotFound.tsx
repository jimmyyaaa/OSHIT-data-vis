/**
 * 404 Not Found 页面
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        页面未找到
      </p>
      <Button onClick={() => navigate('/')}>
        返回主页
      </Button>
    </div>
  );
}
