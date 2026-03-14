"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, MessageSquare, User, Mail, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: dbError } = await supabase.from("feedback").insert([
        {
          name: name.trim() || null,
          email: email.trim() || null,
          message: message.trim(),
        },
      ])

      if (dbError) throw dbError

      setIsSuccess(true)
      // Reset form after a delay
      setTimeout(() => {
        setIsSuccess(false)
        setName("")
        setEmail("")
        setMessage("")
        onClose()
      }, 3000)
    } catch (err) {
      console.error("Feedback submission error:", err)
      setError("Failed to send feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="bg-[#1B4332] p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <MessageSquare className="h-5 w-5" />
                  Send Feedback
                </h3>
                <button
                  onClick={onClose}
                  className="cursor-pointer rounded-full p-1 transition-colors hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
                  <p className="font-bold text-[#1B4332]">Thank You!</p>
                  <p className="text-sm text-gray-500">
                    Your feedback has been sent.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      Name (Optional)
                    </label>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Bug report, feature idea, or just a hello..."
                      rows={4}
                      className="w-full rounded-md border border-gray-200 p-3 text-sm transition-all outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>

                  {error && (
                    <p className="text-xs font-medium text-red-500">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full cursor-pointer bg-[#1B4332] hover:bg-[#2D5A46]"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
