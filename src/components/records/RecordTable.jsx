import React from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";
import DealScoreBadge from "@/components/shared/DealScoreBadge";
import { formatCurrency } from "@/lib/dealScoring";
import { ChevronRight } from "lucide-react";

export default function RecordTable({ records }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No records found. Add your first surplus record to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Owner</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Parcel/APN</TableHead>
            <TableHead className="font-semibold">Surplus</TableHead>
            <TableHead className="font-semibold">Sale Date</TableHead>
            <TableHead className="font-semibold">Score</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id} className="hover:bg-muted/30 transition-colors cursor-pointer group">
              <TableCell>
                <Link to={`/records/${r.id}`} className="block">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{r.owner_name}</p>
                  {r.property_address && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.property_address}</p>
                  )}
                </Link>
              </TableCell>
              <TableCell className="text-sm">
                {r.county && <span>{r.county}, </span>}
                <span className="font-medium">{r.state}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                {r.parcel_apn || "—"}
              </TableCell>
              <TableCell className="text-sm font-semibold text-primary">
                {formatCurrency(r.surplus_amount)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.sale_date ? format(new Date(r.sale_date), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell>
                <DealScoreBadge score={r.deal_score || 0} label={r.deal_label} />
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <Link to={`/records/${r.id}`}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
