import {
  Activity, Award, BookOpen, Box, Brain, Cable, CircleDot, Cpu, Crown, Droplets, Fan, FileCheck, Filter, Flame, Gauge,
  GraduationCap, Grid3x3, HardHat, Link, Microscope, Puzzle, RefreshCw, ScanSearch, Search, ShieldCheck, Sparkles,
  Stethoscope, Target, Thermometer, Timer, Wind, Wrench, Zap, type LucideIcon, HelpCircle,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Activity, Award, BookOpen, Box, Brain, Cable, CircleDot, Cpu, Crown, Droplets, Fan, FileCheck, Filter, Flame, Gauge,
  GraduationCap, Grid3x3, HardHat, Link, Microscope, Puzzle, RefreshCw, ScanSearch, Search, ShieldCheck, Sparkles,
  Stethoscope, Target, Thermometer, Timer, Wind, Wrench, Zap,
};

export function Icon({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  const C = MAP[name] ?? HelpCircle;
  return <C className={className} size={size} aria-hidden />;
}
