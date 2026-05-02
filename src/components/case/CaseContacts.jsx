import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Phone, Mail, MapPin, UserCheck, Ban, Search, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getOsintLinks } from "@/lib/osintProviders";

export default function CaseContacts({ contacts, recordId, record }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showOsint, setShowOsint] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [form, setForm] = useState({ full_name: "", mailing_address: "", phone_numbers: "", emails: "", confidence_score: "", source_provider: "" });
  const queryClient = useQueryClient();
  const osintLinks = record ? getOsintLinks(record) : [];

  const handleSave = async () => {
    await base44.entities.Contact.create({
      record_id: recordId,
      full_name: form.full_name,
      mailing_address: form.mailing_address,
      phone_numbers: form.phone_numbers ? form.phone_numbers.split(",").map(s => s.trim()) : [],
      emails: form.emails ? form.emails.split(",").map(s => s.trim()) : [],
      confidence_score: form.confidence_score ? parseFloat(form.confidence_score) : undefined,
      source_provider: form.source_provider,
    });
    queryClient.invalidateQueries({ queryKey: ["contacts", recordId] });
    toast.success("Contact added");
    setShowAdd(false);
    setForm({ full_name: "", mailing_address: "", phone_numbers: "", emails: "", confidence_score: "", source_provider: "" });
  };

  const handleEnrich = async () => {
    if (!recordId) return;
    setEnriching(true);
    try {
      const result = await base44.functions.invoke("enrichContact", { record_id: recordId });
      if (result?.data?.matched === false) {
        toast.info("No People Data Labs match found");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["contacts", recordId] });
      toast.success("Contact enriched");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Could not enrich contact");
    } finally {
      setEnriching(false);
    }
  };

  const toggleDNC = async (contact) => {
    await base44.entities.Contact.update(contact.id, { do_not_contact: !contact.do_not_contact });
    queryClient.invalidateQueries({ queryKey: ["contacts", recordId] });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Contacts ({contacts.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleEnrich} disabled={!record || enriching} className="gap-1">
                {enriching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                {enriching ? "Finding" : "PDL"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowOsint(v => !v)} disabled={!record} className="gap-1">
                <Search className="w-3 h-3" /> OSINT
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showOsint && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="grid grid-cols-2 gap-2">
                {osintLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                Manual verification only. Follow provider terms and applicable law before outreach.
              </p>
            </div>
          )}
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No contacts added yet</p>
          )}
          {contacts.map(c => (
            <div key={c.id} className={`p-3 rounded-lg border ${c.do_not_contact ? "bg-red-500/5 border-red-500/20" : "bg-muted/30"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {c.full_name}
                    {c.do_not_contact && <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">DNC</Badge>}
                  </p>
                  {c.mailing_address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {c.mailing_address}</p>
                  )}
                  {c.phone_numbers?.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.phone_numbers.join(", ")}</p>
                  )}
                  {c.emails?.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {c.emails.join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {c.confidence_score != null && (
                    <Badge variant="outline" className="text-xs">
                      <UserCheck className="w-3 h-3 mr-1" />{c.confidence_score}%
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => toggleDNC(c)} className="h-7 px-2">
                    <Ban className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {c.source_provider && <p className="text-[10px] text-muted-foreground mt-2">Source: {c.source_provider}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
            <div><Label>Mailing Address</Label><Input value={form.mailing_address} onChange={e => setForm(p => ({...p, mailing_address: e.target.value}))} /></div>
            <div><Label>Phone Numbers (comma separated)</Label><Input value={form.phone_numbers} onChange={e => setForm(p => ({...p, phone_numbers: e.target.value}))} /></div>
            <div><Label>Emails (comma separated)</Label><Input value={form.emails} onChange={e => setForm(p => ({...p, emails: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Confidence Score (0-100)</Label><Input type="number" value={form.confidence_score} onChange={e => setForm(p => ({...p, confidence_score: e.target.value}))} /></div>
              <div><Label>Source Provider</Label><Input value={form.source_provider} onChange={e => setForm(p => ({...p, source_provider: e.target.value}))} placeholder="e.g. BeenVerified" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.full_name}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
