import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { US_STATES } from "@/lib/dealScoring";

const statuses = [
  { value: "all", label: "All Statuses" },
  { value: "new_lead", label: "New Lead" },
  { value: "needs_verification", label: "Needs Verification" },
  { value: "contacted", label: "Contacted" },
  { value: "responded", label: "Responded" },
  { value: "documents_sent", label: "Documents Sent" },
  { value: "agreement_signed", label: "Agreement Signed" },
  { value: "submitted_to_county", label: "Submitted" },
  { value: "paid", label: "Paid" },
  { value: "closed", label: "Closed" },
  { value: "do_not_contact", label: "Do Not Contact" },
];

const dealLabels = [
  { value: "all", label: "All Labels" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "strong_lead", label: "Strong Lead" },
  { value: "needs_research", label: "Needs Research" },
  { value: "low_priority", label: "Low Priority" },
  { value: "compliance_review", label: "Compliance Review" },
];

export default function RecordFilters({ filters, onFilterChange, onClear }) {
  const updateFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasFilters = Object.values(filters).some(v => v && v !== "all");

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search owner, address, parcel..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Select value={filters.state || "all"} onValueChange={(v) => updateFilter("state", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          {US_STATES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.dealLabel || "all"} onValueChange={(v) => updateFilter("dealLabel", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Deal Label" />
        </SelectTrigger>
        <SelectContent>
          {dealLabels.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
          <X className="w-3 h-3" /> Clear
        </Button>
      )}
    </div>
  );
}