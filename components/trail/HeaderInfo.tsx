"use client"

import { memo } from "react"
import { Flag, User, Calendar, Share2, BookmarkPlus, Check, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface HeaderInfoProps {
  raceName: string
  userName: string
  raceDate: string
  onShare?: () => void
  isSharing?: boolean
  onSave?: () => void
  isSaving?: boolean
  isSaved?: boolean
}

export const HeaderInfo = memo(function HeaderInfo({
  raceName,
  userName,
  raceDate,
  onShare,
  isSharing,
  onSave,
  isSaving,
  isSaved,
}: HeaderInfoProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#1B4332]">
            <Flag className="h-5 w-5 text-[#2A9D8F]" />
            {raceName || "Unnamed Route"}
          </h2>
          <div className="flex items-center gap-2">
            {onSave && (
              isSaved ? (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <Check className="h-3.5 w-3.5" />
                  <span>{t("common.saved") || "Tersimpan"}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] px-3 py-1 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#2D5A46] disabled:opacity-50"
                  title="Simpan rute"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3.5 w-3.5" />
                  )}
                  <span>{isSaving ? t("common.loading") : t("common.save")}</span>
                </button>
              )
            )}
            {onShare && (
              <button
                onClick={onShare}
                disabled={isSharing}
                className="group flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1B4332]/5 px-2.5 py-1 text-xs font-bold text-[#1B4332] transition-all hover:bg-[#1B4332] hover:text-white disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>{isSharing ? "Sharing..." : "Share"}</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="h-3.5 w-3.5" />
            {userName || "Anonymous"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#2D3436]">
            <Calendar className="h-3.5 w-3.5 text-[#1B4332]" />
            {raceDate
              ? new Date(raceDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "No Date"}
          </div>
        </div>
      </div>
    </div>
  )
})
