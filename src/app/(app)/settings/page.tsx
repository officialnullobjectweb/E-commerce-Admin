import { ContentSection, PageHeader } from "@/components/layout"
import { AnnouncementForm } from "@/components/settings/AnnouncementForm"
import { ArchiveSection } from "@/components/settings/ArchiveSection"
import { HealthSection } from "@/components/settings/HealthSection"
import { PromoForm } from "@/components/settings/PromoForm"
import { SidebarSection } from "@/components/settings/SidebarSection"
import { TwoFactorSection } from "@/components/settings/TwoFactorSection"
import * as api from "@/lib/api"
import { requireAdmin } from "@/lib/auth"
import type { AnnouncementSettings, PromoSettings } from "@/lib/types"

export const metadata = { title: "Settings", robots: { index: false, follow: false } }

const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: true,
  pages: ["home", "shop", "cart", "product"],
  marquee: false,
  speed: 24,
  link: "",
  messages: [{ text: "Free shipping over ₹999 · 7-day returns · 10% off with REUSE10", link: "" }],
}

const DEFAULT_PROMO: PromoSettings = {
  enabled: false,
  image: "",
  title: "10% off your first case",
  body: "Use code REUSE10 at checkout.",
  cta_label: "Shop cases",
  cta_link: "/shop",
  delay: 4,
}

export default async function SettingsPage() {
  await requireAdmin()
  const [settings, totp, archive, health] = await Promise.all([
    api.getSettings().catch(() => ({ announcement: null, promo: null })),
    api.getTotpState().catch(() => ({ confirmed: false })),
    api.listArchive().catch(() => []),
    api.healthCheck(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Security, storefront messages, trash, and system health." />

      <ContentSection
        title="Two-factor authentication"
        description="Require a rotating authenticator code at login."
      >
        <TwoFactorSection confirmed={totp.confirmed} />
      </ContentSection>

      <ContentSection
        title="Sidebar"
        description="How the desktop navigation behaves. Mobile uses the top-bar menu either way."
      >
        <SidebarSection />
      </ContentSection>

      <ContentSection
        title="Announcement bar"
        description="The thin message strip above the header."
      >
        <AnnouncementForm value={settings.announcement ?? DEFAULT_ANNOUNCEMENT} />
      </ContentSection>

      <ContentSection
        title="Promo modal"
        description="Timed popup — keep it off unless you mean it."
      >
        <PromoForm value={settings.promo ?? DEFAULT_PROMO} />
      </ContentSection>

      <ContentSection
        title="Archive"
        description="Deleted products, categories, coupons and reviews — restore within 7 days."
      >
        <ArchiveSection items={archive} />
      </ContentSection>

      <ContentSection
        title="System health"
        description="Worker API and database reachability."
      >
        <HealthSection initial={health} />
      </ContentSection>
    </div>
  )
}
