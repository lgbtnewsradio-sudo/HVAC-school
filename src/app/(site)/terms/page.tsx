import { ProsePage } from "@/components/prose-page";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <ProsePage title="Terms of service" updated="October 2026">
      <p>By using HVAC Academy you agree to these terms.</p>
      <h2>Educational use</h2>
      <p>The service provides educational content and simulations only. It does not provide professional, engineering or legal advice and does not qualify, license or certify you to perform any work. See the Safety & disclaimer page.</p>
      <h2>Accounts</h2>
      <p>Keep your password secure. One person per account. Don&apos;t attempt to manipulate scores, XP, leaderboards or certificates, or to access other users&apos; data — we may suspend accounts that do.</p>
      <h2>Subscriptions</h2>
      <p>Paid plans renew automatically until canceled. You can cancel anytime from your profile; access continues until the end of the paid period.</p>
      <h2>Limitation of liability</h2>
      <p>To the extent permitted by law, the service is provided &ldquo;as is&rdquo;, and we are not liable for damages arising from use of the content, including any work performed on real equipment.</p>
    </ProsePage>
  );
}
