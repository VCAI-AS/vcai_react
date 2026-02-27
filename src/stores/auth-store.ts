import { create } from 'zustand'
import { tokenKey, userKey } from '@/lib/constants'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '@/lib/localstorage'
import { User as AuthUser } from '@/components/layout/types'

const ACCESS_TOKEN = tokenKey
const USER_KEY = userKey

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}


export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  const userStage = getLocalStorage(USER_KEY)
  const initUser = userStage ? JSON.parse(userStage) : null
  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set(state => {
          if (user) {
            setLocalStorage(USER_KEY, JSON.stringify(user));
          } else {
            removeLocalStorage(USER_KEY);
          }
          return { ...state, auth: { ...state.auth, user } }
        }
        ),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
