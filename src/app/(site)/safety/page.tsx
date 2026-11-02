import { ProsePage } from "@/components/prose-page";
import { SOURCES } from "@/content/sources";

export const metadata = { title: "Safety & disclaimer" };

export default function Safety() {
  return (
    <ProsePage title="Safety & educational disclaimer" updated="October 2026">
      <p>HVAC Academy is educational software. It teaches concepts and diagnostic reasoning through simulations. It is <b>not</b> authorization to perform hazardous work, and completing lessons, games, practice exams or certificates of completion does not make anyone qualified, licensed or certified.</p>
      <h2>Real equipment is dangerous</h2>
      <ul>
        <li>HVAC equipment contains line voltage (120/240 V and higher) that can cause fatal shock and arc-flash burns. Capacitors can hold a charge after power is removed.</li>
        <li>Refrigerant systems are under high pressure and refrigerant can cause frostbite, asphyxiation in confined spaces, and toxic byproducts when heated. Some modern refrigerants are mildly flammable (A2L).</li>
        <li>Fuel-burning appliances can produce carbon monoxide. Brazing is hot work with fire risk.</li>
        <li>Ladders, roofs and attics present fall and heat-stress hazards.</li>
      </ul>
      <h2>Work safely</h2>
      <ul>
        <li>Work on real equipment only with proper training, required licenses/certifications, and qualified supervision where applicable.</li>
        <li>Follow lockout/tagout procedures and verify zero energy with a properly rated, tested meter. Never bypass safety switches or interlocks.</li>
        <li>Never vent refrigerant. Refrigerant handling requires EPA Section 608 certification in the United States.</li>
        <li>Always follow the manufacturer&apos;s installation and service instructions, the codes adopted in your jurisdiction, permit requirements, and your employer&apos;s safety program.</li>
      </ul>
      <h2>Accuracy</h2>
      <p>Content is written against the references below and includes revision dates. General principles are distinguished from equipment-specific procedures; when they differ, the manufacturer&apos;s documentation governs. Simulated readings and PT values are approximate and for training only.</p>
      <h2>References</h2>
      <ul>
        {Object.values(SOURCES).map((s) => (
          <li key={s.id}>
            {s.url ? <a className="text-cool-300 hover:underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title} — {s.publisher}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-500">No affiliation with or endorsement by any organization listed is stated or implied.</p>
    </ProsePage>
  );
}
