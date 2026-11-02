import { ProsePage } from "@/components/prose-page";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <ProsePage title="Privacy policy" updated="October 2026">
      <p>We collect only what we need to run your training account.</p>
      <h2>What we store</h2>
      <ul>
        <li>Account details: your name, email address, a securely hashed password (scrypt), time zone and preferences.</li>
        <li>Learning data: lessons completed, answers, game and simulator results, XP, badges and certificates.</li>
        <li>Billing: if you subscribe, payments are processed by Stripe. We store your Stripe customer ID, never your card number.</li>
      </ul>
      <h2>How it&apos;s used</h2>
      <ul>
        <li>To save your progress across devices, personalize your learning path and issue certificates.</li>
        <li>The leaderboard is opt-in and shows only your display name and weekly XP.</li>
        <li>Certificate pages are viewable by anyone who has the certificate link, so employers can verify them.</li>
      </ul>
      <p>We do not sell your personal information. Session cookies are strictly necessary for sign-in. To delete your account or export your data, contact us at the email on the pricing page.</p>
    </ProsePage>
  );
}
