import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { type LucideIcon } from 'lucide-react'
import { webName } from '@/lib/constants'
import { getIcon } from '@/lib/icon-map'
import ajax from '@/lib/request/ajax'
import api from '@/lib/request/api'

// --- 类型定义 ---
export interface MenuItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: MenuItem[]
}

export interface Team {
  id: number
  name: string
  logo: LucideIcon
  plan: string
  agent: string
}

interface NavContextType {
  isLoading: boolean
  teams: Team[]
  activeTeamId: number
  setActiveTeamId: (id: number) => void
  currentTeamMenu: MenuItem[]
  commonMenu: MenuItem[]
}

const NavContext = createContext<NavContextType | undefined>(undefined)

const COMMON_ROUTES = ['/system', '/member', '/user']
const transformToMenuItem = (nodes: any[]): MenuItem[] => {
  if (!Array.isArray(nodes)) return []

  // 1. 先过滤：只保留 menuType 为 0 (目录) 或 1 (菜单) 的节点
  // 假设后端返回的数据里包含 menuType 字段
  const visibleNodes = nodes.filter(
    (node) => (node.menuType === 0 || node.menuType === 1) && node.isVisible
  )

  return visibleNodes.map((node) => {
    // 2. 递归处理子节点
    const children =
      node.children && node.children.length > 0
        ? transformToMenuItem(node.children)
        : []

    return {
      title: node.title,
      url: node.routePath || '#',
      icon: getIcon(node.icon),
      // 3. 关键逻辑：如果过滤后 children 为空，必须设为 undefined
      // 这样 Sidebar 才会把它渲染成 Link 而不是 Collapsible
      items: children.length > 0 ? children : undefined,
    }
  })
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [menuTree, setMenuTree] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [activeTeamId, setActiveTeamId] = useState<number>(() => {
    const saved = localStorage.getItem('active_dept_id')
    return saved ? parseInt(saved) : 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await ajax.get(api.userPermission)
        const treeData = res?.menuTreeVOs || res || []

        setMenuTree(treeData)

        // 初始化默认选中逻辑
        if (treeData.length > 0) {
          // 如果当前没有选中 ID，或者选中的 ID 在新数据里不存在
          const currentExists = treeData.some(
            (n: any) => n.menuId == activeTeamId
          )

          if (activeTeamId === 0 || !currentExists) {
            const firstTeam = treeData.find(
              (node: any) => !COMMON_ROUTES.includes(node.routePath)
            )
            if (firstTeam) {
              setActiveTeamId(firstTeam.menuId)
            }
          }
        }
      } catch (error) {
        console.error('加载菜单失败', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (activeTeamId) {
      localStorage.setItem('active_dept_id', activeTeamId.toString())
    }
  }, [activeTeamId])

  const processedData = useMemo(() => {
    const teams: Team[] = []
    const commonNodes: any[] = []

    menuTree.forEach((node) => {
      // 增加空值保护
      if (!node) return

      if (COMMON_ROUTES.some((route) => node.routePath?.startsWith(route))) {
        commonNodes.push(node)
      } else {
        teams.push({
          id: node.menuId, // 确保这里是 number，如果是 string 请自行 parseInt
          name: node.title,
          logo: getIcon(node.icon),
          plan: node.title,
          agent: webName,
        })
      }
    })
    return { teams, commonNodes }
  }, [menuTree])

  const currentTeamMenu = useMemo(() => {
    if (!activeTeamId || menuTree.length === 0) return []

    // --- 核心修复 2: 使用宽松相等 (==) 防止 ID 类型不匹配 ---
    // activeTeamId 是 number，后端返回的 menuId 可能是 string
    const activeNode = menuTree.find((node) => node.menuId == activeTeamId)

    if (!activeNode) {
      console.warn(`未找到 ID 为 ${activeTeamId} 的部门菜单`)
      return []
    }

    // 调用外部定义的纯函数
    const data = activeNode.children
      ? transformToMenuItem(activeNode.children)
      : []

    return data
  }, [menuTree, activeTeamId])

  const commonMenu = useMemo(() => {
    return transformToMenuItem(processedData.commonNodes)
  }, [processedData.commonNodes])

  const contextValue = useMemo(
    () => ({
      isLoading,
      teams: processedData.teams,
      activeTeamId,
      setActiveTeamId,
      currentTeamMenu,
      commonMenu,
    }),
    [isLoading, processedData.teams, activeTeamId, currentTeamMenu, commonMenu]
  )

  return (
    <NavContext.Provider value={contextValue}>{children}</NavContext.Provider>
  )
}

export const useNav = () => {
  const context = useContext(NavContext)
  if (!context) throw new Error('useNav must be used within NavProvider')
  return context
}
