import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, LayoutList, Kanban, FileText } from "lucide-react";
import RecordFilters from "@/components/records/RecordFilters";
import RecordTable from "@/components/records/RecordTable";
import KanbanBoard from "@/components/records/KanbanBoard";
import AddRecordDialog from "@/components/records/AddRecordDialog";
import PdfImportDialog from "@/components/records/PdfImportDialog";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { calculateDealScore } from "@/lib/dealScoring";
import { mapCsvRowToSurplusRecord, parseCsvText } from "@/lib/importRecords";
import { toast } from "sonner";

export default function Records() {
  const [filters, setFilters] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState("table");
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState("");
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["surplus-records"],
    queryFn: () => base44.entities.SurplusRecord.list("-created_date", 200),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SurplusRecord.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surplus-records"] }),
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

    setCsvImporting(true);
    setCsvProgress("Reading CSV...");

    try {
      const text = await file.text();
      const parsedRows = parseCsvText(text);
      if (parsedRows.length === 0) {
        toast.error("CSV must have headers and at least one data row");
        return;
      }

      const rows = parsedRows.map((row) => {
        const data = mapCsvRowToSurplusRecord(row);
        if (data.deal_score === undefined || !data.deal_label) {
          const { score, label } = calculateDealScore(data);
          data.deal_score = data.deal_score ?? score;
          data.deal_label = data.deal_label || label;
        }
        return data;
      });

      const validRows = rows.filter((row) => row.owner_name && row.state && row.county);
      const skipped = rows.length - validRows.length;

      if (validRows.length === 0) {
        toast.error("No importable rows found. CSV rows need owner, state, and county fields.");
        return;
      }

      let imported = 0;
      for (const row of validRows) {
        setCsvProgress(`Importing ${imported + 1} of ${validRows.length}...`);
        await base44.entities.SurplusRecord.create(row);
        imported += 1;
      }

      queryClient.invalidateQueries({ queryKey: ["surplus-records"] });
      toast.success(`Imported ${imported} record(s)${skipped ? `, skipped ${skipped}` : ""}`);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "CSV import failed";
      toast.error(`CSV import error: ${msg}`);
    } finally {
      setCsvImporting(false);
      setCsvProgress("");
      e.target.value = "";
    }
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
          <div className="flex rounded-lg border border-input overflow-hidden">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
              className="rounded-none gap-1.5"
            >
              <LayoutList className="w-4 h-4" /> Table
            </Button>
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
              className="rounded-none gap-1.5"
            >
              <Kanban className="w-4 h-4" /> Kanban
            </Button>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={csvImporting} className="gap-2">
            <Upload className="w-4 h-4" /> {csvImporting ? csvProgress || "Importing..." : "Import CSV"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          <Button variant="outline" onClick={() => setShowPdfImport(true)} className="gap-2">
            <FileText className="w-4 h-4" /> Import PDF
          </Button>
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
      ) : view === "kanban" ? (
        <KanbanBoard
          records={filtered}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      ) : (
        <RecordTable records={filtered} />
      )}

      <AddRecordDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(data) => createMutation.mutateAsync(data)}
      />

      <PdfImportDialog
        open={showPdfImport}
        onClose={() => setShowPdfImport(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["surplus-records"] })}
      />
    </div>
  );
}
