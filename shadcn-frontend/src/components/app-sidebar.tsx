'use client'

import * as React from 'react'
import {
    Home,
    BarChart3,
} from 'lucide-react'
import { OrgBrand } from '@/components/org-brand'
import { NavMain } from '@/components/nav-main'
import { useLocale } from '@/contexts/LocaleContext'
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar'

/**
 * AppSidebar 组件
 * 整合 OrgBrand 和 NavMain，提供完整的应用侧边栏
 */

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { getTranslations } = useLocale()
    const t = getTranslations()

    // 菜单数据配置 - 动态生成以支持语言切换
    const navMainData = [
        {
            title: t.sidebar.dashboard,
            url: '/',
            icon: Home,
            isActive: true,
        },
        {
            title: t.sidebar.statistics,
            url: '/statistics',
            icon: BarChart3,
            items: [
                { title: t.sidebar.staking, url: '/statistics/staking' },
                { title: t.sidebar.ts, url: '/statistics/ts' },
                { title: t.sidebar.pos, url: '/statistics/pos' },
                { title: t.sidebar.shitcode, url: '/statistics/shitcode' },
                { title: t.sidebar.revenue, url: '/statistics/revenue' },
                { title: t.sidebar.defi, url: '/statistics/defi' },
            ],
        },
    ]

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <OrgBrand />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMainData} />
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
