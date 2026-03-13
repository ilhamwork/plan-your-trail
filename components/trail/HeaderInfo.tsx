import { Flag, User, Calendar, Share2 } from "lucide-react"

interface HeaderInfoProps {
  routeName: string
  userName: string
  raceDate: string
  onSave?: () => void
  isSaved?: boolean
  onShare?: () => void
  isSharing?: boolean
}

export function HeaderInfo({
  routeName,
  userName,
  raceDate,
  onSave,
  isSaved,
  onShare,
  isSharing,
}: HeaderInfoProps) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-[#1B4332]">
          <Flag className="h-5 w-5 text-[#2A9D8F]" />
          {routeName || "Unnamed Route"}
        </h2>
        <div className="flex gap-2">
          {onShare && (
            <button
              onClick={onShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 rounded-lg bg-[#2A9D8F]/10 px-3 py-1.5 text-xs font-bold text-[#2A9D8F] transition-all hover:bg-[#2A9D8F]/20 active:scale-95 disabled:opacity-50"
            >
              <Share2 className={`h-3.5 w-3.5 ${isSharing ? "animate-pulse" : ""}`} />
              {isSharing ? "Sharing..." : "Share"}
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaved}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                isSaved
                  ? "bg-gray-100 text-gray-400"
                  : "bg-[#1B4332]/10 text-[#1B4332] hover:bg-[#1B4332]/20"
              }`}
            >
              {isSaved ? "Saved" : "Save Route"}
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-between">
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <User className="h-4 w-4" />
          {userName || "Guest"}
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-medium text-[#2D3436]">
          <Calendar className="h-4 w-4 text-[#1B4332]" />
          {raceDate
            ? new Date(raceDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "No Date"}
        </div>
      </div>
    </div>
  )
}
