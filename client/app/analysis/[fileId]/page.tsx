'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { analysisAPI, uploadAPI } from '@/lib/api'
import { 
  ArrowLeft, 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  FileText,
  TrendingUp,
  Shield,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface AnalysisResult {
  sessionId: string
  analysis: {
    anomalies: any[]
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

interface FileDetails {
  id: number
  originalName: string
  logType: string
  uploadDate: string
  entryCount: number
}

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnomalies, setShowAnomalies] = useState(true)

  useEffect(() => {
    loadFileDetails()
    loadAnalysisResults()
  }, [fileId])

  const loadFileDetails = async () => {
    try {
      const details = await uploadAPI.getFile(parseInt(fileId))
      // Use the entryCount from the API response
      setFileDetails({
        ...details,
        entryCount: details.entryCount || 0
      })
    } catch (error) {
      console.error('Failed to load file details:', error)
    }
  }

  const loadAnalysisResults = async () => {
    try {
      const results = await analysisAPI.getResults(parseInt(fileId))
      console.log('Analysis results:', results) // Debug log
      if (results.analyses && results.analyses.length > 0) {
        // Get the latest analysis
        const latestAnalysis = results.analyses[0]
        console.log('Timeline data:', results.timeline) // Debug log
        setAnalysisResult({
          sessionId: latestAnalysis.id,
          analysis: {
            anomalies: results.anomalies || [],
            summary: latestAnalysis.summary,
            confidence: 0.8, // Default confidence
            patterns: {},
            timeline: results.timeline || [],
            recommendations: []
          },
          fileInfo: fileDetails || {
            id: parseInt(fileId),
            originalName: 'Unknown',
            logType: 'unknown',
            uploadDate: new Date().toISOString()
          },
          analyzedAt: latestAnalysis.analysis_date
        })
      }
    } catch (error) {
      console.error('Failed to load analysis results:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const result = await analysisAPI.analyzeFile(parseInt(fileId))
      setAnalysisResult(result)
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-100 text-danger-800 border-danger-200'
      case 'medium':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'low':
        return 'bg-success-100 text-success-800 border-success-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Log Analysis Results
                </h1>
                {fileDetails && (
                  <p className="text-gray-600">
                    {fileDetails.originalName} • {fileDetails.entryCount.toLocaleString()} entries
                  </p>
                )}
              </div>
            </div>
            
            {!analysisResult && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="btn-primary"
              >
                {analyzing ? (
                  <>
                    <div className="loading-spinner h-4 w-4 mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </button>
            )}
          </div>

          {!analysisResult ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analysis yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Run AI-powered analysis to detect anomalies and security threats.
              </p>
              <div className="mt-6">
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="btn-primary"
                >
                  {analyzing ? 'Analyzing...' : 'Start Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Activity className="h-8 w-8 text-primary-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Entries
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analysisResult.analysis.timeline.reduce((sum, t) => sum + t.total_requests, 0).toLocaleString()}
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
                            Anomalies
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {analysisResult.analysis.anomalies.length}
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
                        <Shield className="h-8 w-8 text-success-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Confidence
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {(analysisResult.analysis.confidence * 100).toFixed(0)}%
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
                        <Clock className="h-8 w-8 text-gray-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Analyzed
                          </dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {formatDate(analysisResult.analyzedAt)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              {analysisResult.analysis.timeline.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analysisResult.analysis.timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tickFormatter={(value) => {
                            try {
                              return new Date(value).toLocaleTimeString()
                            } catch (error) {
                              console.error('Date formatting error:', error, 'Value:', value)
                              return 'Invalid Date'
                            }
                          }}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalRequests" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Total Requests"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="anomalyCount" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Anomalies"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Analysis Summary */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Analysis Summary</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 leading-relaxed">
                    {analysisResult.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Anomalies */}
              {analysisResult.analysis.anomalies.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Detected Anomalies ({analysisResult.analysis.anomalies.length})
                      </h3>
                      <button
                        onClick={() => setShowAnomalies(!showAnomalies)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                      >
                        {showAnomalies ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Show Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {showAnomalies && (
                    <div className="divide-y divide-gray-200">
                      {analysisResult.analysis.anomalies.map((anomaly, index) => (
                        <div key={index} className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(anomaly.severity || 'medium')}`}>
                                  {anomaly.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {anomaly.description}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {anomaly.reason}
                              </p>
                              {anomaly.affected_ips && anomaly.affected_ips.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Affected IPs: {anomaly.affected_ips.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {analysisResult.analysis.recommendations.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recommendations</h3>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-3">
                      {analysisResult.analysis.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-primary-600 rounded-full mt-2"></div>
                          </div>
                          <p className="ml-3 text-sm text-gray-700">
                            {recommendation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
