import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import { useNav } from '@/context/nav-context'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup as NavGroupProps } from '@/components/layout/types'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { currentTeamMenu, commonMenu, isLoading } = useNav()
  const {
    auth: { user },
  } = useAuthStore()
  console.log('user', user)
  const dynamicNavGroups = [
    {
      title: 'General',
      items: currentTeamMenu as unknown as NavGroupProps['items'],
    },
    {
      title: 'System',
      items: commonMenu as unknown as NavGroupProps['items'],
    },
  ].filter((g) => g.items && g.items.length > 0)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {isLoading ? (
          <div className='p-4 text-sm text-muted-foreground'>Loading...</div>
        ) : (
          dynamicNavGroups.map((props) => (
            <NavGroup key={props.title} {...props} />
          ))
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
