"use client"

export function Footer() {
  return (
    <footer className="pt-8 text-center">
      <p className="text-sm text-gray-500 italic">
        Built by trail runner, for trail runners.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        © {new Date().getFullYear()} by{" "}
        <a href="https://instagram.com/ilhamontrail">@ilhamontrail</a>
      </p>
    </footer>
  )
}
