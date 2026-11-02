import { getCurrentUser } from "@/server/auth";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  return (
    <>
      <SiteHeader signedIn={!!u} />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
