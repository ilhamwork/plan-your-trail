import { Flag, User, Calendar } from "lucide-react"

interface HeaderInfoProps {
  raceName: string
  userName: string
  raceDate: string
}

export function HeaderInfo({ raceName, userName, raceDate }: HeaderInfoProps) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm md:flex-row md:items-center">
      <h2 className="flex items-center gap-2 text-xl font-bold text-[#1B4332]">
        <Flag className="h-5 w-5 text-[#2A9D8F]" />
        {raceName || "Unnamed Route"}
      </h2>
      <div className="flex justify-between">
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <User className="h-4 w-4" />
          {userName || "Anonymous"}
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
