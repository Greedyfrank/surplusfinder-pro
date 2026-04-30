import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/dealScoring";
import { Badge } from "@/components/ui/badge";

export default function CaseDetails({ record }) {
  const details = [
    { label: "State", value: record.state },
    { label: "County", value: record.county },
    { label: "Property Address", value: record.property_address },
    { label: "Parcel / APN", value: record.parcel_apn },
    { label: "Surplus Amount", value: formatCurrency(record.surplus_amount) },
    { label: "Sale Date", value: record.sale_date ? format(new Date(record.sale_date), "MMMM d, yyyy") : null },
    { label: "Case Number", value: record.case_number },
    { label: "Record Type", value: record.record_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) },
    { label: "Fee %", value: record.company_fee_percent ? `${record.company_fee_percent}%` : null },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Case Details</CardTitle>
          <Badge variant={record.compliance_cleared ? "default" : "outline"} className={record.compliance_cleared ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
            {record.compliance_cleared ? "Compliance Cleared" : "Compliance Pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {details.map(d => d.value && (
            <div key={d.label}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{d.label}</p>
              <p className="text-sm font-medium mt-1">{d.value}</p>
            </div>
          ))}
        </div>
        {record.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm">{record.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}