import { NextRequest, NextResponse } from "next/server"

function isAuthenticated(req: NextRequest): boolean {
  const expectedUser = process.env.INVOICE_ADMIN_USER
  const expectedPass = process.env.INVOICE_ADMIN_PASSWORD

  if (!expectedUser || !expectedPass) {
    return false
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false
  }

  try {
    const base64Credentials = authHeader.slice(6).trim()
    const decoded = atob(base64Credentials)
    const colonIndex = decoded.indexOf(":")
    if (colonIndex === -1) return false

    const user = decoded.slice(0, colonIndex)
    const pass = decoded.slice(colonIndex + 1)

    return user === expectedUser && pass === expectedPass
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  if (!isAuthenticated(req)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Invoice Area", charset="UTF-8"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/invoice", "/invoice/:path*"],
}
