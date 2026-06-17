import axios, { AxiosInstance } from "axios";

export function getToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  } catch {
    return null;
    
  }
}

export function setToken(token: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  } catch {}
}

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // normalize error
    const err: any = new Error(
      error?.response?.data?.message || error?.message || "Request failed"
    );
    err.status = error?.response?.status;
    err.body = error?.response?.data;
    return Promise.reject(err);
  }
);

export const apiGet = async <T = any>(path: string) => {
  const res = await api.get<T>(path);
  return res.data as T;
};

export const apiPost = async <T = any>(path: string, body?: any) => {
  const res = await api.post<T>(path, body);
  return res.data as T;
};

export const apiPatch = async <T = any>(path: string, body?: any) => {
  const res = await api.patch<T>(path, body);
  return res.data as T;
};

export const apiDelete = async <T = any>(path: string) => {
  const res = await api.delete<T>(path);
  return res.data as T;
};

export default api;
