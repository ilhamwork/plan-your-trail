import { NextRequest, NextResponse } from "next/server"
import { isInvoiceAuthBypassed, verifyInvoiceBasicAuth } from "@/lib/auth/basic"

export function proxy(req: NextRequest) {
  if (isInvoiceAuthBypassed()) {
    return NextResponse.next()
  }

  if (!verifyInvoiceBasicAuth(req.headers.get("authorization"))) {
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
