import { type LinkProps } from '@tanstack/react-router'

type User = {
  userId: number
  deptId: number
  deptName: string
  userName: string
  fullName: string
  phoneNumber: string
  sex: number
  admin: number
  adminName: string
  accessToken: string
  approver: boolean
  loginTime: string
  lastAccessTime: number
  avatar?: string
  email?: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}


export type { User, SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
