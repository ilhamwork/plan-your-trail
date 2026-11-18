import { Header } from "@/components/trail/Header"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="sm:hidden">
        <Header />
      </div>
      {children}
    </>
  )
}

