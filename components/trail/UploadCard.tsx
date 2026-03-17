"use client"

import { useCallback, useRef, useState } from "react"
import { FileUp, FileCheck } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface UploadCardProps {
  onFileLoaded: (content: string, fileName: string) => void
  onError?: (message: string) => void
  fileName?: string
  error?: string
  isLoading?: boolean
}

export function UploadCard({
  onFileLoaded,
  onError,
  fileName,
  error,
  isLoading,
}: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      // Clear previous errors if parent provided onError
      if (onError) onError("")

      if (!file.name.endsWith(".gpx")) {
        if (onError) onError("Please upload a .gpx file")
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        if (onError) onError("File is too large (max 10MB)")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onFileLoaded(content, file.name)
      }
      reader.readAsText(file)
    },
    [onFileLoaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleLoadExample = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsLoadingExample(true)
      try {
        const response = await fetch("/Rinjani-162K-2025.gpx")
        const content = await response.text()
        onFileLoaded(content, "Rinjani-162K-2025.gpx")
      } catch (err) {
        console.error("Failed to load example:", err)
      } finally {
        setIsLoadingExample(false)
      }
    },
    [onFileLoaded]
  )

  const hasFile = !!fileName

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`relative max-w-100 cursor-pointer overflow-hidden rounded-2xl bg-[#1B4332] text-white shadow-lg transition-all duration-300 hover:bg-[#2D5A46] ${
          hasFile ? "p-3" : "p-10 text-center"
        } ${isDragging ? "scale-[1.02] ring-4 ring-[#E76F51]" : ""}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gpx"
          onChange={handleChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {hasFile ? (
            <motion.div
              key="loaded"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A9D8F]/20 text-[#2A9D8F]">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="max-w-9/12 min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {fileName}
                </p>
                <p className="text-[10px] font-medium text-white/50">
                  GPX file loaded • Tap to change (Max 10MB)
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <FileUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold">Import GPX</p>
                  <p className="text-sm text-white/50">
                    Drop file or tap to browse
                  </p>
                  <p className="mt-1 text-[10px] font-medium text-white/30">
                    (Max 10MB)
                  </p>
                </div>
              </div>

              <div className="mt-2 w-full border-t border-white/10 pt-4">
                <button
                  onClick={handleLoadExample}
                  disabled={isLoadingExample || isLoading}
                  className="mx-auto flex h-9 min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E76F51] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#D55A3C] active:scale-95 disabled:opacity-70"
                >
                  {isLoadingExample || isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    "TRY GPX"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-center text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
