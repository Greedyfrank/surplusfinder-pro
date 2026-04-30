import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import axios from "axios";
import { FileText, Upload, CheckCircle, Loader2, X } from "lucide-react";
import { calculateDealScore } from "@/lib/dealScoring";
import { toast } from "sonner";

export default function PdfImportDialog({ open, onClose, onImported }) {
  const [step, setStep] = useState("upload"); // upload | reviewing | importing
  const [extractedRecords, setExtractedRecords] = useState([]);
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const fileInputRef = useRef(null);

  const reset = () => {
    setStep("upload");
    setExtractedRecords([]);
    setSummary("");
    setSelected([]);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); }
    setPdfUrl(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPdfUrl(localUrl);
    setStep("reviewing");
    setSummary("Uploading and analyzing PDF...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { functionsVersion, appId, appBaseUrl } = appParams;
      const baseUrl = appBaseUrl || "";
      const versionSegment = functionsVersion ? `/${functionsVersion}` : "";
      const url = `${baseUrl}/api/functions${versionSegment}/${appId}/uploadAndExtractPdf`;

      const token = appParams.token;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const res = await axios.post(url, formData, { headers });
      const { records, summary: s } = res.data;

      if (!records || records.length === 0) {
        toast.error("No surplus records found in this PDF");
        setStep("upload");
        URL.revokeObjectURL(localUrl);
        setPdfUrl(null);
        return;
      }

      setExtractedRecords(records);
      setSummary(s || `Found ${records.length} record(s) in the document.`);
      setSelected(records.map((_, i) => i));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Upload failed";
      toast.error(`PDF import error: ${msg}`);
      setStep("upload");
      URL.revokeObjectURL(localUrl);
      setPdfUrl(null);
    }
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

  const isSplitScreen = step === "reviewing" || step === "importing";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={
          isSplitScreen
            ? "max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
            : "max-w-lg"
        }
      >
        <DialogHeader className="px-5 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import from PDF
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="p-6">
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
          </div>
        )}

        {isSplitScreen && (
          <div className="flex flex-1 min-h-0">
            {/* LEFT: PDF Viewer */}
            <div className="flex-1 border-r border-border flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground flex-shrink-0">
                Original Document
              </div>
              <div className="flex-1 min-h-0">
                {pdfUrl ? (
                  <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No PDF loaded
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Extracted Records */}
            <div className="w-[380px] flex-shrink-0 flex flex-col min-h-0">
              <div className="px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground flex-shrink-0">
                Extracted Records
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  {step === "importing" ? (
                    <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> Importing records...</>
                  ) : extractedRecords.length === 0 ? (
                    <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> {summary}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {summary}</>
                  )}
                </div>

                {extractedRecords.length > 0 && step !== "importing" && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        {selected.length}/{extractedRecords.length} selected
                      </p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() =>
                        selected.length === extractedRecords.length
                          ? setSelected([])
                          : setSelected(extractedRecords.map((_, i) => i))
                      }>
                        {selected.length === extractedRecords.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>

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
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {rec.surplus_amount > 0 && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5 text-xs">
                                ${Number(rec.surplus_amount).toLocaleString()}
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
                        {rec.case_number && (
                          <p className="text-xs text-muted-foreground">Case: {rec.case_number}</p>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="px-4 py-3 border-t flex-shrink-0 flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose} size="sm">Cancel</Button>
                {step === "reviewing" && extractedRecords.length > 0 && (
                  <Button onClick={handleImport} disabled={selected.length === 0} size="sm">
                    Import {selected.length} Record{selected.length !== 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "upload" && (
          <DialogFooter className="px-6 pb-5">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}