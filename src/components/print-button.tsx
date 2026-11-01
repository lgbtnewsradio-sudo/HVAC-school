"use client";
import { Printer } from "lucide-react";
import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="no-print">
      <Printer size={18} /> Print / save as PDF
    </Button>
  );
}
