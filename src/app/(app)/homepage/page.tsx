import { ContentSection, PageHeader } from "@/components/layout"
import { HomepageEditor } from "@/components/home/HomepageEditor"
import { listHomeSections } from "@/lib/api"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: "Homepage", robots: { index: false, follow: false } }

export default async function HomepagePage() {
  await requireAdmin()
  const sections = await listHomeSections().catch(() => [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage"
        description="Enable, reorder, and rename the sections on the storefront home page."
      />
      <ContentSection
        title="Sections"
        description="Top to bottom on the storefront. Labels and limits apply on the next render."
      >
        <HomepageEditor sections={sections} />
      </ContentSection>
    </div>
  )
}
