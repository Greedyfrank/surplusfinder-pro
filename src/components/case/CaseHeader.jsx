import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/shared/StatusBadge";
import DealScoreBadge from "@/components/shared/DealScoreBadge";
import { formatCurrency } from "@/lib/dealScoring";

const allStatuses = [
  "new_lead", "needs_verification", "contacted", "responded",
  "documents_sent", "agreement_signed", "submitted_to_county", "paid", "closed", "do_not_contact"
];

export default function CaseHeader({ record, onStatusChange }) {
  return (
    <div className="space-y-4">
      <Link to="/records" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Records
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{record.owner_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {record.property_address || `${record.county}, ${record.state}`}
            {record.case_number && <span className="ml-2">· Case #{record.case_number}</span>}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <StatusBadge status={record.status} />
            <DealScoreBadge score={record.deal_score || 0} label={record.deal_label} />
            <span className="text-lg font-bold text-primary">{formatCurrency(record.surplus_amount)}</span>
            {record.source_url && (
              <a href={record.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Source
              </a>
            )}
          </div>
        </div>
        <Select value={record.status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            {allStatuses.map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}