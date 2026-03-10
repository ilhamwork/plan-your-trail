"use client";

export function Footer() {
  return (
    <footer className="py-6 text-center">
      <p className="text-sm italic text-gray-400">
        Built by trail runner, for trail runners.
      </p>
      <p className="mt-1 text-xs text-gray-300">
        © {new Date().getFullYear()} by @ilhamontrail
      </p>
    </footer>
  );
}
