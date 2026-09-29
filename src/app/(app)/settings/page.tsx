import { ContentSection, PageHeader } from "@/components/layout"
import { AnnouncementForm } from "@/components/settings/AnnouncementForm"
import { PromoForm } from "@/components/settings/PromoForm"
import { getSettings } from "@/lib/api"
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
  const settings = await getSettings().catch(() => ({
    announcement: null,
    promo: null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Storefront announcement bar and promo modal." />

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
    </div>
  )
}
