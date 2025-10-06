'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadAPI } from '@/lib/api'
import { Upload, File as FileIcon, CheckCircle, AlertCircle, Loader } from 'lucide-react'

interface FileUploadProps {
  onFileUploaded: () => void
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [customFileName, setCustomFileName] = useState('')
  const [showNamingStep, setShowNamingStep] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setSelectedFile(file)
    setCustomFileName(file.name.replace(/\.[^/.]+$/, "")) // Remove extension for default name
    setShowNamingStep(true)
    setUploadStatus({ type: null, message: '' })
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || !customFileName.trim()) return

    setUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      // Create a new File object with the custom name
      const renamedFile = new File([selectedFile], `${customFileName.trim()}${getFileExtension(selectedFile.name)}`, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified
      })

      const response = await uploadAPI.uploadFile(renamedFile)
      setUploadStatus({
        type: 'success',
        message: `File "${customFileName}" uploaded successfully! Processed ${response.metadata.validEntries} log entries.`
      })
      
      // Reset the form
      setSelectedFile(null)
      setCustomFileName('')
      setShowNamingStep(false)
      onFileUploaded()
    } catch (error: any) {
      console.error('Upload error details:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      let errorMessage = 'Upload failed. Please try again.'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.'
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Maximum size is 10MB.'
      } else if (error.response?.status === 415) {
        errorMessage = 'Unsupported file type. Please use .txt, .log, .csv, .json, or .jsonl files.'
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection and try again.'
      }
      
      setUploadStatus({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setCustomFileName('')
    setShowNamingStep(false)
    setUploadStatus({ type: null, message: '' })
  }

  const getFileExtension = (filename: string) => {
    return filename.substring(filename.lastIndexOf('.'))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log', '.jsonl'],
      'text/csv': ['.csv'],
      'application/json': ['.json', '.jsonl']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading || showNamingStep
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
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          uploading || showNamingStep
            ? 'opacity-50 cursor-not-allowed border-gray-200'
            : isDragActive
            ? 'border-primary-400 bg-primary-50 cursor-pointer'
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
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
                <FileIcon className="h-8 w-8 text-gray-400" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Naming Step */}
      {showNamingStep && selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <FileIcon className="h-6 w-6 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Name Your File</h3>
              <p className="text-sm text-blue-700 mb-4">
                Give your file a unique name to help identify it later. This will be used when viewing analysis results.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                    File Name
                  </label>
                  <div className="flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="fileName"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="Enter a unique name for your file"
                      className="flex-1 rounded-l-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      {getFileExtension(selectedFile.name)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Original file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpload}
                    disabled={!customFileName.trim() || uploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="-ml-1 mr-2 h-4 w-4" />
                        Upload & Analyze
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleCancel}
                    disabled={uploading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
