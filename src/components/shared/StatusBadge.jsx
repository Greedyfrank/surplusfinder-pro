import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  new_lead: { label: "New Lead", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  needs_verification: { label: "Needs Verification", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  contacted: { label: "Contacted", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  responded: { label: "Responded", className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  documents_sent: { label: "Documents Sent", className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  agreement_signed: { label: "Agreement Signed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  submitted_to_county: { label: "Submitted", className: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-700 border-green-500/20" },
  closed: { label: "Closed", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  do_not_contact: { label: "Do Not Contact", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", config.className)}>
      {config.label}
    </Badge>
  );
}