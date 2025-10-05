'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { FileUpload } from '@/components/FileUpload'
import { FileList } from '@/components/FileList'
import { AnalysisDashboard } from '@/components/AnalysisDashboard'
import { uploadAPI } from '@/lib/api'
import { LogFile } from '@/lib/api'

export default function DashboardPage() {
  const [files, setFiles] = useState<LogFile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upload' | 'files' | 'analysis'>('upload')

  const { user } = useAuth()

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const response = await uploadAPI.getFiles()
      setFiles(response.files)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploaded = () => {
    loadFiles()
    setActiveTab('files')
  }

  const tabs = [
    { id: 'upload', name: 'Upload Logs', icon: '📤' },
    { id: 'files', name: 'My Files', icon: '📁' },
    { id: 'analysis', name: 'Analysis', icon: '📊' }
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.username}!
              </h1>
              <p className="text-gray-600 mt-1">
                Upload and analyze your cybersecurity logs with AI-powered threat detection.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                      📁
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Files
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {files.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-success-100 rounded-md flex items-center justify-center">
                      ✅
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Processed Files
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {files.filter(f => f.processingStatus === 'completed').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-warning-100 rounded-md flex items-center justify-center">
                      ⚠️
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Cloudflare One
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {files.filter(f => f.logType === 'cloudflare_one').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'upload' && (
                <FileUpload onFileUploaded={handleFileUploaded} />
              )}
              
              {activeTab === 'files' && (
                <FileList 
                  files={files} 
                  loading={loading} 
                  onRefresh={loadFiles}
                />
              )}
              
              {activeTab === 'analysis' && (
                <AnalysisDashboard files={files} />
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
