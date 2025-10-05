'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { analysisAPI, LogFile } from '@/lib/api'
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Shield, 
  Clock,
  FileText,
  Activity,
  CheckCircle
} from 'lucide-react'

interface AnalysisDashboardProps {
  files: LogFile[]
}

interface AnalysisSession {
  id: string
  summary: string
  totalEntries: number
  anomalyCount: number
  analysisDate: string
  filename: string
  logType: string
}

export function AnalysisDashboard({ files }: AnalysisDashboardProps) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalysisSessions()
  }, [])

  const loadAnalysisSessions = async () => {
    try {
      const response = await analysisAPI.getSessions()
      setSessions(response.sessions)
    } catch (error) {
      console.error('Failed to load analysis sessions:', error)
    } finally {
      setLoading(false)
    }
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

  const completedFiles = files.filter(f => f.processingStatus === 'completed')
  const totalAnomalies = sessions.reduce((sum, session) => sum + session.anomalyCount, 0)
  const totalEntries = sessions.reduce((sum, session) => sum + session.totalEntries, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Analysis Dashboard</h2>
        <p className="text-sm text-gray-600">
          View analysis results and security insights from your uploaded log files.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Analyzed Files
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.length}
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
                <Activity className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Entries
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalEntries.toLocaleString()}
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
                <AlertTriangle className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Anomalies Found
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalAnomalies}
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
                <Shield className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Threat Level
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalAnomalies > 10 ? 'High' : totalAnomalies > 5 ? 'Medium' : 'Low'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analysis Sessions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Analysis</h3>
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload and analyze your first log file to see results here.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard?tab=upload"
                className="btn-primary"
              >
                Upload Log File
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {session.totalEntries.toLocaleString()} entries • {session.anomalyCount} anomalies
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(session.analysisDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4 text-warning-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {session.anomalyCount}
                      </span>
                    </div>
                    <Link
                      href={`/analysis/${session.id}`}
                      className="btn-outline text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available for Analysis */}
      {completedFiles.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Ready for Analysis</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {completedFiles.slice(0, 3).map((file) => (
              <div key={file.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-success-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-success-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Ready for AI analysis
                      </p>
                    </div>
                  </div>
                  
                  <Link
                    href={`/analysis/${file.id}`}
                    className="btn-primary text-sm"
                  >
                    Analyze Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
