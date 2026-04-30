import React from "react";
import { cn } from "@/lib/utils";
import { Flame, TrendingUp, Search, ArrowDown, ShieldAlert } from "lucide-react";

const labelConfig = {
  hot_lead: { label: "Hot Lead", icon: Flame, className: "text-red-500 bg-red-500/10" },
  strong_lead: { label: "Strong Lead", icon: TrendingUp, className: "text-emerald-500 bg-emerald-500/10" },
  needs_research: { label: "Needs Research", icon: Search, className: "text-amber-500 bg-amber-500/10" },
  low_priority: { label: "Low Priority", icon: ArrowDown, className: "text-gray-400 bg-gray-400/10" },
  compliance_review: { label: "Compliance Review", icon: ShieldAlert, className: "text-orange-500 bg-orange-500/10" },
};

export default function DealScoreBadge({ score, label }) {
  const config = labelConfig[label] || labelConfig.needs_research;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold", config.className)}>
        <Icon className="w-3 h-3" />
        <span>{score}</span>
      </div>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}