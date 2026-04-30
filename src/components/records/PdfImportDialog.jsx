import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { calculateDealScore } from "@/lib/dealScoring";
import { toast } from "sonner";

export default function PdfImportDialog({ open, onClose, onImported }) {
  const [step, setStep] = useState("upload"); // upload | reviewing | importing | done
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const reset = () => {
    setStep("upload");
    setExtractedRecords([]);
    setSummary("");
    setSelected([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file");
      return;
    }
    setStep("reviewing");
    setSummary("Uploading and analyzing PDF...");

    // Read file as base64 data URL, then upload
    const fileDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: fileDataUrl });

    // Extract records via AI
    const res = await base44.functions.invoke('extractPdfLeads', { file_url });
    const { records, summary: s } = res.data;

    if (!records || records.length === 0) {
      toast.error("No surplus records found in this PDF");
      setStep("upload");
      return;
    }

    setExtractedRecords(records);
    setSummary(s || `Found ${records.length} record(s) in the document.`);
    setSelected(records.map((_, i) => i)); // select all by default
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    const toImport = extractedRecords.filter((_, i) => selected.includes(i));
    setStep("importing");

    for (const rec of toImport) {
      const data = {
        ...rec,
        status: "new_lead",
        record_type: rec.record_type || "other",
        surplus_amount: parseFloat(rec.surplus_amount) || 0,
      };
      const { score, label } = calculateDealScore(data);
      data.deal_score = score;
      data.deal_label = label;
      if (data.owner_name && data.state && data.county) {
        await base44.entities.SurplusRecord.create(data);
      }
    }

    toast.success(`Imported ${toImport.length} record(s) from PDF`);
    onImported();
    handleClose();
  };

  const toggleSelect = (i) => {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import from PDF
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Drop a PDF here or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Supports tax sale lists, foreclosure auction documents, county surplus notices
            </p>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={(e) => processFile(e.target.files?.[0])} />
          </div>
        )}

        {step === "reviewing" && (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              {extractedRecords.length === 0 ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {summary}</>
              ) : (
                <><CheckCircle className="w-4 h-4 text-emerald-500" /> {summary}</>
              )}
            </div>

            {extractedRecords.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Select records to import ({selected.length}/{extractedRecords.length})</p>
                  <Button variant="ghost" size="sm" onClick={() =>
                    selected.length === extractedRecords.length
                      ? setSelected([])
                      : setSelected(extractedRecords.map((_, i) => i))
                  }>
                    {selected.length === extractedRecords.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {extractedRecords.map((rec, i) => (
                    <div
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selected.includes(i)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{rec.owner_name || "Unknown Owner"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {rec.property_address || `${rec.county || ""}${rec.county && rec.state ? ", " : ""}${rec.state || ""}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {rec.surplus_amount > 0 && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                              ${rec.surplus_amount.toLocaleString()}
                            </Badge>
                          )}
                          {rec.state && <Badge variant="outline" className="text-xs">{rec.state}</Badge>}
                          {selected.includes(i)
                            ? <CheckCircle className="w-4 h-4 text-primary" />
                            : <X className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                      </div>
                      {rec.parcel_apn && (
                        <p className="text-xs text-muted-foreground mt-1">APN: {rec.parcel_apn}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing records...</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step === "reviewing" && extractedRecords.length > 0 && (
            <Button onClick={handleImport} disabled={selected.length === 0}>
              Import {selected.length} Record{selected.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}