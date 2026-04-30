import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download } from "lucide-react";
import RecordFilters from "@/components/records/RecordFilters";
import RecordTable from "@/components/records/RecordTable";
import AddRecordDialog from "@/components/records/AddRecordDialog";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { calculateDealScore } from "@/lib/dealScoring";
import { toast } from "sonner";

export default function Records() {
  const [filters, setFilters] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["surplus-records"],
    queryFn: () => base44.entities.SurplusRecord.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { score, label } = calculateDealScore(data);
      return base44.entities.SurplusRecord.create({ ...data, deal_score: score, deal_label: label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surplus-records"] });
      toast.success("Record created");
    },
  });

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("CSV must have headers and data"); return; }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        if (h === "surplus_amount") obj[h] = parseFloat(values[i]) || 0;
        else obj[h] = values[i] || "";
      });
      const { score, label } = calculateDealScore(obj);
      obj.deal_score = score;
      obj.deal_label = label;
      obj.status = "new_lead";
      return obj;
    });

    for (const row of rows) {
      if (row.owner_name && row.state && row.county) {
        await base44.entities.SurplusRecord.create(row);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["surplus-records"] });
    toast.success(`Imported ${rows.length} records`);
    e.target.value = "";
  };

  const handleExportCSV = () => {
    const headers = ["owner_name", "state", "county", "property_address", "parcel_apn", "surplus_amount", "sale_date", "case_number", "source_url", "status", "deal_score", "notes"];
    const csv = [headers.join(","), ...records.map(r => headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "surplus_records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = records.filter(r => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const match = [r.owner_name, r.property_address, r.parcel_apn, r.county, r.case_number]
        .filter(Boolean).some(v => v.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (filters.state && filters.state !== "all" && r.state !== filters.state) return false;
    if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.dealLabel && filters.dealLabel !== "all" && r.deal_label !== filters.dealLabel) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surplus Records</h1>
          <p className="text-sm text-muted-foreground mt-1">{records.length} total records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        </div>
      </div>

      <DisclaimerBanner />

      <RecordFilters filters={filters} onFilterChange={setFilters} onClear={() => setFilters({})} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RecordTable records={filtered} />
      )}

      <AddRecordDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  );
}