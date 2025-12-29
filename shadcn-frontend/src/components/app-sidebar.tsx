'use client'

import * as React from 'react'
import {
  Home,
  BarChart3,
} from 'lucide-react'
import { OrgBrand } from '@/components/org-brand'
import { NavMain } from '@/components/nav-main'
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

// 菜单数据配置
const navMainData = [
  {
    title: 'Dashboard',
    url: '/',
    icon: Home,
    isActive: true,
  },
  {
    title: 'Statistics',
    url: '/statistics',
    icon: BarChart3,
    items: [
      { title: 'Staking', url: '/statistics/staking' },
      { title: 'TS Trading', url: '/statistics/ts' },
      { title: 'POS', url: '/statistics/pos' },
      { title: 'ShitCode', url: '/statistics/shitcode' },
      { title: 'Revenue', url: '/statistics/revenue' },
      { title: 'DeFi', url: '/statistics/defi' },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
