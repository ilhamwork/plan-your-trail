import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request?: Request) {
  if (request) {
    try {
      const url = new URL(request.url)
      if (url.searchParams.get("check") === "db") {
        await db.execute(sql`SELECT 1`)
        return NextResponse.json({ status: "ok", db: "ok" })
      }
    } catch {
      return NextResponse.json(
        { status: "error", db: "unreachable" },
        { status: 503 }
      )
    }
  }

  return NextResponse.json({ status: "ok" })
}
