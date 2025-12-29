'use client'

import { useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * 动态面包屑组件
 * 根据当前路径自动生成面包屑导航
 */

interface BreadcrumbSegment {
  label: string
  href: string
}

export function DynamicBreadcrumb() {
  const location = useLocation()

  // 路由标签映射
  const routeLabelMap: Record<string, string> = {
    '': 'Dashboard',
    'statistics': 'Statistics',
    'staking': 'Staking',
    'ts': 'TS Trading',
    'pos': 'POS',
    'shitcode': 'ShitCode',
    'revenue': 'Revenue',
    'defi': 'DeFi',
  }

  // 生成面包屑段落
  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    const pathParts = location.pathname
      .split('/')
      .filter(Boolean)

    if (pathParts.length === 0) {
      return [{ label: 'Dashboard', href: '/' }]
    }

    let accumulatedPath = ''
    return pathParts.map((part) => {
      accumulatedPath += `/${part}`
      const label = routeLabelMap[part] || part
      return { label, href: accumulatedPath }
    })
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
