'use client'

import { useState } from 'react'
import Link from 'next/link'
import { uploadAPI } from '@/lib/api'
import { LogFile } from '@/lib/api'
import { 
  FileText, 
  Calendar, 
  HardDrive, 
  MoreVertical, 
  Trash2, 
  Eye,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface FileListProps {
  files: LogFile[]
  loading: boolean
  onRefresh: () => void
}

export function FileList({ files, loading, onRefresh }: FileListProps) {
  const [deletingFile, setDeletingFile] = useState<number | null>(null)

  const handleDelete = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return
    }

    setDeletingFile(fileId)
    try {
      await uploadAPI.deleteFile(fileId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file. Please try again.')
    } finally {
      setDeletingFile(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-warning-500 animate-pulse" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-danger-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800'
      case 'processing':
        return 'bg-warning-100 text-warning-800'
      case 'failed':
        return 'bg-danger-100 text-danger-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by uploading your first log file.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Uploaded Files</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {files.map((file) => (
            <li key={file.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.originalName}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(file.processingStatus)}`}>
                          {getStatusIcon(file.processingStatus)}
                          <span className="ml-1 capitalize">{file.processingStatus}</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(file.uploadDate)}
                        </div>
                        <div className="flex items-center">
                          <HardDrive className="h-4 w-4 mr-1" />
                          {formatFileSize(file.fileSize)}
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            {file.logType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.processingStatus === 'completed' && (
                      <Link
                        href={`/analysis/${file.id}?action=analyze`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analyze
                      </Link>
                    )}
                    
                    <div className="relative">
                      <button
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          // Handle dropdown menu
                          const menu = document.getElementById(`menu-${file.id}`)
                          if (menu) {
                            menu.classList.toggle('hidden')
                          }
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      <div
                        id={`menu-${file.id}`}
                        className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleDelete(file.id)}
                            disabled={deletingFile === file.id}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                          >
                            {deletingFile === file.id ? (
                              <div className="loading-spinner h-4 w-4 mr-2"></div>
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
