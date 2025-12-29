/**
 * 主布局组件
 * 包含侧边栏、头部和主内容区域
 */

'use client'

import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { DynamicBreadcrumb } from '@/components/DynamicBreadcrumb'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'

export const MainLayout = () => {
  return (
    <SidebarProvider className="h-screen overflow-hidden flex">
      <AppSidebar className='shrink-0' />
      <SidebarInset className='flex-1 h-full overflow-hidden flex flex-col'>
        <header className="flex w-full h-14 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <DynamicBreadcrumb />
          </div>
          {/* 右侧主题和语言切换 */}
          <div className="ml-auto pr-4 flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <div className="w-full flex-1 overflow-hidden">
            <Outlet />
        </div>

      </SidebarInset>
    </SidebarProvider>
  )
}
