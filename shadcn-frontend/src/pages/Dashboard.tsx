/**
 * Dashboard 主页
 * 快速导航 + 关键指标概览
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Zap, Coins, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocale } from '@/contexts/LocaleContext';

interface StatCard {
    title: string;
    description: string;
    icon: React.ReactNode;
    route: string;
    color: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { getTranslations } = useLocale();
    const t = getTranslations();

    const sections: StatCard[] = [
        {
            title: t.sidebar.staking,
            description: t.dashboard.stakingDesc,
            icon: <Coins className="h-6 w-6" />,
            route: '/statistics/staking',
            color: 'from-blue-500 to-blue-600',
        },
        {
            title: t.sidebar.ts,
            description: t.dashboard.tsDesc,
            icon: <TrendingUp className="h-6 w-6" />,
            route: '/statistics/ts',
            color: 'from-purple-500 to-purple-600',
        },
        {
            title: t.sidebar.pos,
            description: t.dashboard.posDesc,
            icon: <Zap className="h-6 w-6" />,
            route: '/statistics/pos',
            color: 'from-pink-500 to-pink-600',
        },
        {
            title: t.sidebar.shitcode,
            description: t.dashboard.shitcodeDesc,
            icon: <Code2 className="h-6 w-6" />,
            route: '/statistics/shitcode',
            color: 'from-orange-500 to-orange-600',
        },
        {
            title: t.sidebar.revenue,
            description: t.dashboard.revenueDesc,
            icon: <Coins className="h-6 w-6" />,
            route: '/statistics/revenue',
            color: 'from-green-500 to-green-600',
        },
        {
            title: t.sidebar.defi,
            description: t.dashboard.defiDesc,
            icon: <TrendingUp className="h-6 w-6" />,
            route: '/statistics/defi',
            color: 'from-indigo-500 to-indigo-600',
        },
    ];

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            <ScrollArea className="h-full w-full">
                <div className="@container w-full space-y-8 p-6">
                    {/* 标题部分 */}
                    <div className="border-b pb-8">
                        <h1 className="text-4xl font-bold">{t.dashboard.welcome}</h1>
                        <p className="text-muted-foreground mt-2 text-lg">{t.dashboard.welcomeDesc}</p>
                    </div>

                    {/* 快速导航卡片网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sections.map((section) => (
                            <Card
                                key={section.route}
                                className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                onClick={() => navigate(section.route)}
                            >
                                <CardHeader className="pb-3">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-linear-to-br ${section.color} text-white mb-3 group-hover:scale-110 transition-transform`}>
                                        {section.icon}
                                    </div>
                                    <CardTitle>{section.title}</CardTitle>
                                    <CardDescription>{section.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <Button variant="ghost" size="sm" className="w-full justify-between group-hover:bg-accent">
                                        {t.dashboard.viewDetails}
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* 快速统计 */}
                    {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">监控模块数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">6</div>
                <p className="text-xs text-muted-foreground mt-1">数据源</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">实时更新</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">24h</div>
                <p className="text-xs text-muted-foreground mt-1">数据周期</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">数据精度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">100%</div>
                <p className="text-xs text-muted-foreground mt-1">Google Sheets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">图表类型</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12+</div>
                <p className="text-xs text-muted-foreground mt-1">ECharts</p>
              </CardContent>
            </Card>
          </div> */}
                </div>
            </ScrollArea>
        </div>
    );
}
