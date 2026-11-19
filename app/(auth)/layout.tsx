import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Map, BarChart3, CloudSun } from "lucide-react"
import { Header } from "@/components/trail/Header"
import { getServerTranslations } from "@/lib/i18n/server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = await getServerTranslations()

  return (
    <>
      <div className="sm:hidden">
        <Header />
      </div>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-2">
        {/* Desktop Editorial Brand Panel (AllTrails / Airbnb Split Auth) */}
        <aside className="relative hidden overflow-hidden bg-[#1B4332] p-12 text-[#FAF6F1] lg:flex lg:flex-col lg:justify-between">
          {/* Subtle Topographic Contour Motif */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 600"
            className="pointer-events-none absolute -right-24 -bottom-24 h-[520px] w-[520px] opacity-[0.07]"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="300" cy="300" r="90" />
              <ellipse cx="300" cy="300" rx="150" ry="125" transform="rotate(-18 300 300)" />
              <ellipse cx="300" cy="300" rx="215" ry="175" transform="rotate(-18 300 300)" />
              <ellipse cx="300" cy="300" rx="280" ry="225" transform="rotate(-18 300 300)" />
            </g>
          </svg>

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/text-logo-white.png"
                alt="PlanYourTrail"
                width={176}
                height={44}
                priority
              />
            </Link>
          </div>

          <div className="relative z-10 max-w-md space-y-6">
            <h2 className="text-3xl leading-tight font-bold tracking-tight text-[#FAF6F1]">
              {t("home.empty.headline")}
            </h2>

            <ul className="space-y-4 text-sm text-[#FAF6F1]/90">
              <li className="flex items-start gap-3">
                <Map className="mt-0.5 h-5 w-5 shrink-0 text-[#74C69D]" aria-hidden="true" />
                <span>{t("home.features.routeMapDesc")}</span>
              </li>
              <li className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-[#E76F51]" aria-hidden="true" />
                <span>{t("home.features.elevationDesc")}</span>
              </li>
              <li className="flex items-start gap-3">
                <CloudSun className="mt-0.5 h-5 w-5 shrink-0 text-[#74C69D]" aria-hidden="true" />
                <span>{t("home.features.weatherDesc")}</span>
              </li>
            </ul>
          </div>

          <p className="relative z-10 text-xs text-[#FAF6F1]/70">
            © {new Date().getFullYear()} PlanYourTrail.run
          </p>
        </aside>

        {/* Right Form Area */}
        <div className="relative flex flex-col justify-center bg-white">
          <div className="hidden lg:block lg:px-10 lg:pt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] transition hover:text-[#1B4332]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("nav.home")}</span>
            </Link>
          </div>
          <div className="flex-1 lg:flex lg:items-center lg:justify-center">
            <div className="w-full">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
