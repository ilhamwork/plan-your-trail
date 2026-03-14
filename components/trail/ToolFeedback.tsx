"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function ToolFeedback() {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (rating: "yes" | "no") => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from("tool_feedback")
        .insert([{ rating }])
      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error("Failed to submit tool feedback:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center border-t border-gray-100">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-sm font-medium text-gray-500">
              Was this tool helpful?
            </p>
            <div className="flex gap-4">
              <button
                disabled={isSubmitting}
                onClick={() => handleFeedback("yes")}
                className="group flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-green-200 hover:bg-green-50 active:scale-95 disabled:opacity-50"
              >
                <ThumbsUp className="h-4 w-4 text-gray-400 transition-colors group-hover:text-green-500" />
                Yes
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleFeedback("no")}
                className="group flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-red-200 hover:bg-red-50 active:scale-95 disabled:opacity-50"
              >
                <ThumbsDown className="h-4 w-4 text-gray-400 transition-colors group-hover:text-red-500" />
                Not really
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm font-semibold text-[#1B4332]"
          >
            <CheckCircle2 className="h-5 w-5" />
            Thanks for your feedback!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
