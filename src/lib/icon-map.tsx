import {
  Settings,
  User,
  Brain,
  // 对应策略部
  Database,
  ChartPie,
  // 对应基金部
  Server,
  Briefcase,
  // 对应管理部
  Users,
  // 对应客户部
  LayoutDashboard,
  FileText,
  type LucideIcon,
} from 'lucide-react'

// 根据你的截图和业务猜测的映射，请根据实际情况调整
export const iconMap: Record<string, LucideIcon> = {
  // 部门图标
  'icon-strategy': Brain, // 策略部
  'icon-fundation': ChartPie, // 基金部 (对应截图中的 fundation)
  'icon-manage': Briefcase, // 管理部
  'icon-tech': Server, // 技术部
  'icon-customer': Users, // 客户部

  // 公共/系统图标
  'icon-setting': Settings, // 系统管理
  'icon-user': User, // 个人中心/用户
  'icon-system': Settings,

  // 默认图标
  default: FileText,
}

export const getIcon = (iconName: string | undefined) => {
  if (!iconName) return iconMap['default']
  // 处理一下可能的空格
  const key = iconName.trim()
  return iconMap[key] || iconMap['default']
}
