import { Flag, User, Calendar } from "lucide-react"

interface HeaderInfoProps {
  raceName: string
  userName: string
  raceDate: string
}

export function HeaderInfo({
  raceName,
  userName,
  raceDate,
}: HeaderInfoProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center">
      <div className="flex w-full flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#1B4332]">
            <Flag className="h-5 w-5 text-[#2A9D8F]" />
            {raceName || "Unnamed Route"}
          </h2>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="h-3.5 w-3.5" />
            {userName || "Anonymous"}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#2D3436]">
            <Calendar className="h-3.5 w-3.5 text-[#1B4332]" />
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
    </div>
  )
}
