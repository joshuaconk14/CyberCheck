import axios, { AxiosResponse } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: number
  username: string
  email: string
}

export interface LoginResponse {
  message: string
  token: string
  user: User
}

export interface RegisterResponse {
  message: string
  user: User
}

export interface LogFile {
  id: number
  filename: string
  originalName: string
  fileSize: number
  logType: string
  uploadDate: string
  processingStatus: string
}

export interface LogEntry {
  timestamp: string
  source_ip: string
  destination_ip: string
  url: string
  user_agent: string
  status_code: number
  bytes_sent: number
  method: string
  is_anomaly?: boolean
  anomaly_score?: number
  anomaly_reason?: string
}

export interface Anomaly {
  type: string
  description: string
  confidence: number
  reason: string
  severity: 'high' | 'medium' | 'low'
  affected_ips?: string[]
  recommendations?: string[]
}

export interface AnalysisResult {
  sessionId: string
  analysis: {
    anomalies: Anomaly[]
    summary: string
    confidence: number
    patterns: any
    timeline: any[]
    recommendations: string[]
  }
  fileInfo: {
    id: number
    originalName: string
    logType: string
    uploadDate: string
  }
  analyzedAt: string
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await api.post('/api/auth/login', {
      email,
      password,
    })
    return response.data
  },

  register: async (username: string, email: string, password: string): Promise<RegisterResponse> => {
    const response: AxiosResponse<RegisterResponse> = await api.post('/api/auth/register', {
      username,
      email,
      password,
    })
    return response.data
  },

  verifyToken: async (token: string): Promise<{ valid: boolean; user: User }> => {
    const response = await api.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/api/auth/profile')
    return response.data
  },
}

// Upload API
export const uploadAPI = {
  uploadFile: async (file: File): Promise<any> => {
    const formData = new FormData()
    formData.append('logFile', file)

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getFiles: async (): Promise<{ files: LogFile[] }> => {
    const response = await api.get('/api/upload')
    return response.data
  },

  getFile: async (fileId: number): Promise<LogFile> => {
    const response = await api.get(`/api/upload/${fileId}`)
    return response.data
  },

  deleteFile: async (fileId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/upload/${fileId}`)
    return response.data
  },

  getParserInfo: async (): Promise<any> => {
    const response = await api.get('/api/upload/parsers/info')
    return response.data
  },
}

// Analysis API
export const analysisAPI = {
  analyzeFile: async (fileId: number): Promise<AnalysisResult> => {
    const response = await api.post(`/api/analysis/analyze/${fileId}`)
    return response.data
  },

  getResults: async (fileId: number): Promise<any> => {
    const response = await api.get(`/api/analysis/results/${fileId}`)
    return response.data
  },

  getSummary: async (fileId: number): Promise<any> => {
    const response = await api.get(`/api/analysis/summary/${fileId}`)
    return response.data
  },

  getSessions: async (): Promise<{ sessions: any[] }> => {
    const response = await api.get('/api/analysis/sessions')
    return response.data
  },
}

export default api
