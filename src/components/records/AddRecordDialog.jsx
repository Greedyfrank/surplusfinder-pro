import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES } from "@/lib/dealScoring";

const emptyRecord = {
  owner_name: "", state: "", county: "", property_address: "",
  parcel_apn: "", surplus_amount: "", sale_date: "", case_number: "",
  source_url: "", record_type: "tax_sale", notes: "",
};

export default function AddRecordDialog({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(initialData || emptyRecord);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        surplus_amount: form.surplus_amount ? parseFloat(form.surplus_amount) : undefined,
        status: "new_lead",
      });
      setForm(emptyRecord);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Record" : "Add Surplus Record"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Owner Name *</Label>
            <Input value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>State *</Label>
            <Select value={form.state} onValueChange={(v) => update("state", v)}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>County *</Label>
            <Input value={form.county} onChange={(e) => update("county", e.target.value)} placeholder="County name" />
          </div>
          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input value={form.property_address} onChange={(e) => update("property_address", e.target.value)} placeholder="Full address" />
          </div>
          <div className="space-y-2">
            <Label>Parcel / APN</Label>
            <Input value={form.parcel_apn} onChange={(e) => update("parcel_apn", e.target.value)} placeholder="Parcel number" />
          </div>
          <div className="space-y-2">
            <Label>Surplus Amount</Label>
            <Input type="number" value={form.surplus_amount} onChange={(e) => update("surplus_amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Sale Date</Label>
            <Input type="date" value={form.sale_date} onChange={(e) => update("sale_date", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Case Number</Label>
            <Input value={form.case_number} onChange={(e) => update("case_number", e.target.value)} placeholder="Case #" />
          </div>
          <div className="space-y-2">
            <Label>Source URL</Label>
            <Input value={form.source_url} onChange={(e) => update("source_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Record Type</Label>
            <Select value={form.record_type} onValueChange={(v) => update("record_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tax_sale">Tax Sale</SelectItem>
                <SelectItem value="foreclosure">Foreclosure</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.owner_name || !form.state || !form.county}>
            {saving ? "Saving..." : "Save Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
