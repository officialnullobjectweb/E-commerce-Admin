import { AppShell } from "@/components/layout"
import { ToastProvider } from "@/components/feedback"
import { Providers } from "@/components/providers"

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </Providers>
  )
}
