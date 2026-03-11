"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadCardProps {
  onFileLoaded: (content: string, fileName: string) => void;
  fileName?: string;
  error?: string;
}

export function UploadCard({ onFileLoaded, fileName, error }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".gpx")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoaded(content, file.name);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const hasFile = !!fileName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className={`relative cursor-pointer overflow-hidden rounded-2xl bg-[#1B4332] p-8 text-center text-white shadow-lg transition-all duration-300 ${isDragging ? "ring-4 ring-[#E76F51] scale-[1.02]" : ""
          }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E76F51]">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">File loaded:</p>
                <p className="text-lg font-bold">{fileName}</p>
              </div>
              <p className="text-sm text-white/60">
                Tap to upload a different file
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <FileUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold">Drop your GPX file here</p>
                <p className="text-sm text-white/60">or tap to browse</p>
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
  );
}
