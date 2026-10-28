/**
 * Authentication error handling and timeout fallbacks.
 *
 * Provides user-friendly Indonesian messages for various failure modes
 * (database unreachable, network offline/drop, timeout, invalid credentials, rate limit)
 * and guarantees that UI actions never get stuck in a loading state.
 */

/**
 * Parses any error into a clear, helpful message in Bahasa Indonesia.
 * Differentiates database/server connectivity issues from invalid credentials.
 */
export function parseAuthError(
  error: unknown,
  fallbackMessage = "Terjadi kendala. Silakan coba lagi nanti."
): string {
  // 1. Check if browser is actively offline
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return "Tidak ada koneksi internet. Silakan periksa koneksi Anda dan coba lagi."
  }

  // 2. Check for Error instances (Abort/Timeout/Network)
  if (error instanceof Error) {
    const errorName = error.name || ""
    const errorMsg = (error.message || "").toLowerCase()

    if (
      errorName === "AbortError" ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("aborted") ||
      errorMsg.includes("waktu")
    ) {
      return "Waktu koneksi habis. Silakan coba lagi beberapa saat lagi."
    }

    if (
      errorMsg.includes("failed to fetch") ||
      errorMsg.includes("networkerror") ||
      errorMsg.includes("network request failed") ||
      errorMsg.includes("econnrefused") ||
      errorMsg.includes("connection refused") ||
      errorMsg.includes("fetch error")
    ) {
      return "Gagal terhubung. Silakan periksa koneksi internet Anda dan coba lagi."
    }
  }

  // 3. Inspect Better Auth error response object: { status, statusText, message, code }
  if (typeof error === "object" && error !== null) {
    const err = error as {
      status?: number
      statusText?: string
      message?: string
      code?: string
      error?: unknown
    }

    // If there's an inner error, unpack and parse
    if (err.error && typeof err.error === "object") {
      return parseAuthError(err.error, fallbackMessage)
    }

    const status = err.status
    const msg = (err.message || "").toLowerCase()
    const code = (err.code || "").toUpperCase()

    // Internal service or connection errors (500, 502, 503, 504)
    if (
      (typeof status === "number" && status >= 500) ||
      code === "INTERNAL_SERVER_ERROR" ||
      msg.includes("internal server error") ||
      msg.includes("database") ||
      msg.includes("connection") ||
      msg.includes("postgres") ||
      msg.includes("econnrefused") ||
      msg.includes("drizzle")
    ) {
      return "Terjadi kendala pada sistem. Silakan coba lagi beberapa saat lagi."
    }

    // Timeout status codes
    if (status === 408 || status === 504) {
      return "Waktu koneksi habis. Silakan coba lagi beberapa saat lagi."
    }

    // Rate limiting
    if (status === 429 || code === "TOO_MANY_REQUESTS" || msg.includes("too many")) {
      return "Terlalu banyak percobaan. Harap tunggu beberapa saat sebelum mencoba kembali."
    }

    // Email not verified
    if (code === "EMAIL_NOT_VERIFIED" || msg.includes("email not verified") || msg.includes("belum diverifikasi")) {
      return "Email belum diverifikasi. Silakan periksa inbox kamu untuk tautan verifikasi."
    }

    // User already registered (signup)
    if (
      code === "USER_ALREADY_EXISTS" ||
      msg.includes("user already exists") ||
      msg.includes("already exists") ||
      msg.includes("already registered")
    ) {
      return "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain."
    }

    // Invalid credentials (login)
    if (
      code === "INVALID_EMAIL_OR_PASSWORD" ||
      status === 401 ||
      msg.includes("invalid email or password") ||
      msg.includes("invalid password") ||
      msg.includes("user not found")
    ) {
      return "Email atau kata sandi tidak valid. Silakan coba lagi."
    }

    // Invalid email format
    if (code === "INVALID_EMAIL" || msg.includes("invalid email")) {
      return "Format alamat email tidak valid."
    }

    // Password requirements
    if (code === "PASSWORD_TOO_SHORT" || msg.includes("password too short")) {
      return "Kata sandi harus minimal 8 karakter."
    }

    // Reset password token errors
    if (
      code === "INVALID_TOKEN" ||
      msg.includes("invalid token") ||
      msg.includes("token expired") ||
      msg.includes("expired token")
    ) {
      return "Token pengaturan ulang tidak valid atau sudah kedaluwarsa."
    }

    // If there is a clean custom message from the server that doesn't look like code
    if (err.message && !err.message.includes("\n") && err.message.length < 150) {
      return err.message
    }
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error
  }

  return fallbackMessage
}

/**
 * Wraps any promise with an offline pre-check and a hard timeout.
 * Prevents UI loading spinners from hanging indefinitely if network drops or DB freezes.
 *
 * @param actionPromise The async operation to execute (e.g. signIn.email, signUp.email)
 * @param timeoutMs Maximum milliseconds before timing out (default: 15,000ms / 15s)
 * @param timeoutMessage Fallback error message if timeout expires
 */
export async function withAuthTimeout<T>(
  actionPromise: Promise<T>,
  timeoutMs = 15000,
  timeoutMessage = "Waktu koneksi habis. Silakan coba lagi beberapa saat lagi."
): Promise<T> {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    throw new Error("Tidak ada koneksi internet. Silakan periksa koneksi Anda dan coba lagi.")
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)
  })

  try {
    return await Promise.race([actionPromise, timeoutPromise])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
