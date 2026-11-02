import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { certificates } from "@/server/db/schema";
import { LEVELS } from "@/content/levels";
import { BRAND } from "@/lib/brand";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { LinkButton } from "@/components/ui";

export const metadata = { title: "Certificate of completion", robots: { index: false } };

/** Public verification page: anyone with the link can confirm the certificate is genuine. */
export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^c_[\w-]{10,30}$/.test(id)) notFound();
  const db = await getDb();
  const [c] = await db.select().from(certificates).where(eq(certificates.id, id));
  if (!c) notFound();
  const lvl = LEVELS.find((l) => l.id === c.levelId);
  const what = c.levelId === "master" ? "the complete HVAC Academy program — all ten levels and the comprehensive final exam" : `Level ${lvl?.number}: ${lvl?.title}`;
  return (
    <div className="min-h-dvh bg-ink-950 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border-8 border-double border-cool-400/40 bg-gradient-to-br from-ink-800 to-ink-900 p-8 text-center sm:p-14 print:border-slate-400 print:bg-white print:text-black">
        <div className="flex justify-center">
          <LogoMark size={64} />
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-cool-300">Certificate of completion</div>
        <div className="mt-6 text-slate-400 print:text-slate-600">This certifies that</div>
        <div className="mt-2 font-display text-4xl font-bold text-white print:text-black sm:text-5xl">{c.recipientName}</div>
        <div className="mx-auto mt-4 max-w-xl text-lg text-slate-300 print:text-slate-700">has successfully completed {what} of {BRAND.name}, including interactive lessons and a timed checkpoint exam with a score of {Math.round(c.score)}%.</div>
        <div className="mt-8 grid gap-4 text-sm text-slate-400 sm:grid-cols-2 print:text-slate-600">
          <div>
            Issued <b className="text-white print:text-black">{c.issuedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</b>
          </div>
          <div>
            Certificate ID <b className="font-mono text-white print:text-black">{c.id}</b>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-xs leading-relaxed text-slate-500">
          This is a certificate of completion for educational coursework. It is not a license, an EPA Section 608 certification, or a credential from NATE, HVAC Excellence or any certifying or government body, and it does not authorize the holder to perform regulated or hazardous work.
        </p>
      </div>
      <div className="no-print mx-auto mt-6 flex max-w-4xl justify-center gap-3">
        <PrintButton />
        <LinkButton href="/" variant="ghost">{BRAND.name}</LinkButton>
      </div>
    </div>
  );
}
