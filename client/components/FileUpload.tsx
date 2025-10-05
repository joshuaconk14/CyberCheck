'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadAPI } from '@/lib/api'
import { Upload, File, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface FileUploadProps {
  onFileUploaded: () => void
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      const response = await uploadAPI.uploadFile(file)
      setUploadStatus({
        type: 'success',
        message: `File uploaded successfully! Processed ${response.metadata.validEntries} log entries.`
      })
      onFileUploaded()
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || 'Upload failed. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }, [onFileUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log', '.jsonl'],
      'text/csv': ['.csv'],
      'application/json': ['.json', '.jsonl']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Upload Log File</h2>
        <p className="text-sm text-gray-600">
          Upload Cloudflare One logs or other supported formats for AI-powered analysis.
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader className="h-12 w-12 text-primary-600 animate-spin" />
              <p className="text-lg font-medium text-gray-900">Processing...</p>
              <p className="text-sm text-gray-600">Uploading and parsing your log file</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <Upload className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop your log file here'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  or click to browse files
                </p>
              </div>
              <div className="flex justify-center">
                <File className="h-8 w-8 text-gray-400" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload Status */}
      {uploadStatus.type && (
        <div className={`rounded-md p-4 ${
          uploadStatus.type === 'success' 
            ? 'bg-success-50 border border-success-200' 
            : 'bg-danger-50 border border-danger-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-success-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-danger-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                uploadStatus.type === 'success' ? 'text-success-800' : 'text-danger-800'
              }`}>
                {uploadStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supported Formats */}
      <div className="bg-gray-50 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Supported Formats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">Cloudflare One</h4>
            <p>JSON/JSONL format web proxy logs</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Future Support</h4>
            <p>Palo Alto Networks, Cisco Umbrella</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <p>Maximum file size: 10MB</p>
        </div>
      </div>
    </div>
  )
}
