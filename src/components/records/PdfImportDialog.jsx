import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import axios from "axios";
import { FileText, Upload, CheckCircle, Loader2, X } from "lucide-react";
import { calculateDealScore } from "@/lib/dealScoring";
import { parseSurplusRecordsFromPdfText } from "@/lib/importRecords";
import { dedupeRecords, recordIdentityKey } from "@/lib/records";
import { toast } from "sonner";

const PDFJS_VERSION = "4.10.38";
const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build`;
let pdfjsPromise;

const pageContentToLines = (content) => {
  const items = content.items
    .filter((item) => item.str?.trim())
    .map((item) => ({
      text: item.str,
      x: item.transform?.[4] || 0,
      y: Math.round(item.transform?.[5] || 0),
    }))
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const lines = [];
  for (const item of items) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(last.y - item.y) > 2) {
      lines.push({ y: item.y, parts: [item] });
    } else {
      last.parts.push(item);
    }
  }

  return lines.map((line) =>
    line.parts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.text)
      .join(" | ")
      .replace(/\s+/g, " ")
      .trim()
  );
};

const loadPdfJs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ `${PDFJS_CDN_BASE}/pdf.mjs`).then((module) => {
      module.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.mjs`;
      return module;
    });
  }
  return pdfjsPromise;
};

export default function PdfImportDialog({ open, onClose, onImported, existingRecords = [] }) {
  const [step, setStep] = useState("upload"); // upload | reviewing | importing
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

  const handleClose = () => {
    reset();
    onClose();
  };

  const extractRecordsLocally = async (file) => {
    setSummary("Reading PDF text locally...");
    const pdfjsLib = await loadPdfJs();
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setSummary(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pageContentToLines(content).join("\n"));
    }

    return parseSurplusRecordsFromPdfText(pages.join("\n"));
  };

  const extractRecordsWithFunction = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const { functionsVersion, appId } = appParams;
    const versionSegment = functionsVersion ? `/${functionsVersion}` : "";
    const url = `/api/functions${versionSegment}/${appId}/uploadAndExtractPdf`;
    const token = appParams.token;
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    setSummary("Analyzing PDF with AI. This may take up to a minute...");
    const res = await axios.post(url, formData, { headers, timeout: 45000 });
    return {
      records: res.data?.records || [],
      summary: res.data?.summary || "",
    };
  };

  const processFile = async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file");
      return;
    }
    setStep("reviewing");
    setSummary("Uploading PDF...");

    try {
      let records = [];
      let s = "";

      let localRecords = [];
      try {
        localRecords = await extractRecordsLocally(file);
      } catch {
        localRecords = [];
      }

      if (localRecords.length > 0) {
        records = localRecords;
        s = `Found ${localRecords.length} record(s) with local PDF text extraction.`;
      } else {
        const remoteResult = await extractRecordsWithFunction(file);
        records = remoteResult.records;
        s = remoteResult.summary;
      }

      if (records.length > 0) {
        const existingKeys = new Set(existingRecords.map(recordIdentityKey));
        const uniqueRecords = dedupeRecords(records);
        records = uniqueRecords.filter((record) => !existingKeys.has(recordIdentityKey(record)));
        const skipped = uniqueRecords.length - records.length;
        if (skipped > 0) {
          toast.info(`${skipped} duplicate PDF record(s) were skipped.`);
        }
      }

      if (records.length === 0 && localRecords?.length > 0) {
        toast.error("All records in this PDF already exist.");
        setStep("upload");
        return;
      }

      if (!records || records.length === 0) {
        toast.error("No surplus records found in this PDF");
        setStep("upload");
        return;
      }

      setExtractedRecords(records);
      setSummary(s || `Found ${records.length} record(s) in the document.`);
      setSelected(records.map((_, i) => i));
    } catch (err) {
      const isTimeout = err.code === "ECONNABORTED" || err?.message?.includes("timeout");
      const msg = isTimeout
        ? "The PDF took too long to process and local extraction found no rows."
        : err?.response?.data?.error || err?.message || "Upload failed";
      toast.error(`PDF import error: ${msg}`);
      setStep("upload");
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

    try {
      let imported = 0;
      for (const rec of toImport) {
        setSummary(`Importing ${imported + 1} of ${toImport.length}...`);
        const data = {
          ...rec,
          status: "new_lead",
          record_type: rec.record_type || "other",
          surplus_amount: parseFloat(rec.surplus_amount) || 0,
        };
        const { score, label } = calculateDealScore(data);
        data.deal_score = data.deal_score ?? score;
        data.deal_label = data.deal_label || label;
        if (data.owner_name && data.state && data.county) {
          await base44.entities.SurplusRecord.create(data);
          imported += 1;
        }
      }

      toast.success(`Imported ${imported} record(s) from PDF`);
      onImported();
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Import failed";
      toast.error(`PDF import error: ${msg}`);
      setStep("reviewing");
    }
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => processFile(e.target.files?.[0])}
            />
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
                      {rec.case_number && (
                        <p className="text-xs text-muted-foreground mt-1">Case: {rec.case_number}</p>
                      )}
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
            <p className="text-sm text-muted-foreground">{summary || "Importing records..."}</p>
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
