export const getLocalStorage = (key: string) => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.error('读取本地存储失败：', e);
        return null;
    }
};

export const setLocalStorage = (key: string, value: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('写入本地存储失败：', e);
    }
};

export const removeLocalStorage = (key: string) => {
    localStorage.removeItem(key)
}