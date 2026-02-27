import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { showSessionExpiredDialog } from './auth-dialog'
import { tokenKey, whitePaths } from '@/lib/constants'

// ==========================================
// 1. 类型定义与配置
// ==========================================

// 扩展 AxiosRequestConfig 以支持自定义属性
declare module 'axios' {
    export interface AxiosRequestConfig {
        /** 是否显示操作成功的 Toast */
        showSuccessMessage?: boolean
        /** 是否显示失败的 Toast (默认为 true) */
        showErrorMessage?: boolean
        /** 是否是大文件上传 (用于设置长超时) */
        isUpload?: boolean
    }
}

// 默认配置
const config: AxiosRequestConfig = {
    baseURL: '/ssl',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
}

const service: AxiosInstance = axios.create(config)

// ==========================================
// 2. Token 管理
// ==========================================
const TokenManager = {
    get: () => localStorage.getItem(tokenKey),
    set: (token: string) => localStorage.setItem(tokenKey, token),
    remove: () => localStorage.removeItem(tokenKey),
}

// ==========================================
// 3. 请求拦截器
// ==========================================
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 1. 注入 Token
        const token = TokenManager.get()
        if (token && config.headers) {
            config.headers.Authorization = token
        }

        // 2. GET 请求防缓存 (可选)
        // if (config.method?.toUpperCase() === 'GET') {
        //     config.params = { ...config.params, _t: Date.now() }
        // }

        // 3. 上传请求特殊处理
        if (config.isUpload) {
            config.timeout = 60 * 1000 * 5 // 5分钟
        }

        return config
    },
    (error) => {
        console.error('Request Setup Error:', error)
        return Promise.reject(error)
    }
)

// ==========================================
// 4. 响应拦截器
// ==========================================
service.interceptors.response.use(
    (response: AxiosResponse) => {
        const { data, config } = response
        // 处理二进制流 (下载文件)
        if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
            return data
        }
        const code = data.code ?? data.status
        const msg = data.message || '操作失败'
        const resultData = data.data ?? data.result ?? null

        // 自动刷新 Token (如果有)
        if (data?.data?.accessToken) {
            TokenManager.set(data.data.accessToken)
        }

        // === 请求成功 (业务状态码 200) ===
        if (code === 200) {
            // 只有显式开启 showSuccessMessage 时才弹出 Toast
            if (config.showSuccessMessage) {
                toast.success(msg)
            }
            return resultData // 直接返回业务数据
        }

        // === 业务错误 (非 200) ===
        handleBusinessError(code, msg, config)
        return Promise.reject(new Error(msg))
    },
    (error) => {
        // === HTTP 网络错误处理 ===
        let msg = '网络连接异常'

        if (error.response) {
            const { status } = error.response
            switch (status) {
                case 401:
                    showSessionExpiredDialog()
                    // 401 不弹出普通 Toast，以免和弹窗冲突
                    return Promise.reject(error)
                case 403:
                    msg = '拒绝访问: 您没有权限执行此操作'
                    break
                case 404:
                    msg = '资源不存在 (404)'
                    break
                case 500:
                    msg = '服务器内部错误 (500)'
                    break
                case 503:
                    msg = '服务不可用 (503)'
                    break
                default:
                    msg = `请求错误 (${status})`
            }
        } else if (error.message.includes('timeout')) {
            msg = '请求超时，请检查网络'
        }

        // 如果没有被静音错误，则弹出 Toast
        if (error.config?.showErrorMessage !== false) {
            toast.error(msg, {
                description: error.config?.url, // 可选：在描述里显示出错的 URL
            })
        }

        return Promise.reject(error)
    }
)

/**
 * 处理业务状态码错误
 */
function handleBusinessError(code: number, msg: string, config: AxiosRequestConfig) {
    // 如果配置了不显示错误，直接返回
    if (config.showErrorMessage === false) return

    switch (code) {
        case 401:
            showSessionExpiredDialog()
            break
        case 403:
            toast.error('权限不足', { description: msg })
            break
        default:
            toast.error(msg || '操作失败')
    }
}

// ==========================================
// 5. 导出请求方法
// ==========================================

// 通用请求函数
const request = <T = any>(
    url: string,
    method: string,
    paramsOrData: any = {},
    options: AxiosRequestConfig = {}
): Promise<T> => {
    return service.request<any, T>({
        url,
        method,
        [method.toUpperCase() === 'GET' ? 'params' : 'data']: paramsOrData,
        ...options
    })
}

export default {
    // 暴露原始实例
    service,

    get<T = any>(url: string, params?: any, options?: AxiosRequestConfig) {
        return request<T>(url, 'GET', params, options)
    },

    post<T = any>(url: string, data?: any, options?: AxiosRequestConfig) {
        return request<T>(url, 'POST', data, options)
    },

    put<T = any>(url: string, data?: any, options?: AxiosRequestConfig) {
        return request<T>(url, 'PUT', data, options)
    },

    delete<T = any>(url: string, params?: any, options?: AxiosRequestConfig) {
        return request<T>(url, 'DELETE', params, options)
    },

    upload<T = any>(url: string, formData: FormData, options?: AxiosRequestConfig) {
        return request<T>(url, 'POST', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            isUpload: true,
            ...options
        })
    },

    download(url: string, params?: any) {
        return service.get(url, {
            params,
            responseType: 'blob'
        })
    }
}