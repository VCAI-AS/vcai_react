import { createRoot } from 'react-dom/client'
import { tokenKey, whitePaths } from '@/lib/constants'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

let isDialogOpen = false
export function showSessionExpiredDialog() {
  if (isDialogOpen) return
  isDialogOpen = true
  const currentPath = window.location.pathname.split('?')[0]
  const isAuthPage = whitePaths.some((prefix) => {
    return currentPath.startsWith(prefix)
  })
  if (isAuthPage) {
    localStorage.removeItem(tokenKey)
    return
  }
  // 1. 创建一个临时的 DOM 节点
  const div = document.createElement('div')
  div.id = 'session-expired-dialog'
  document.body.appendChild(div)

  const root = createRoot(div)

  const handleConfirm = () => {
    localStorage.removeItem(tokenKey)
    isDialogOpen = false
    root.unmount()
    div.remove()
    window.location.href = '/sign-in'
  }
  root.render(
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>登录已过期</AlertDialogTitle>
          <AlertDialogDescription>
            您的登录凭证已失效，为了安全起见，请重新登录。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm}>
            重新登录
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
