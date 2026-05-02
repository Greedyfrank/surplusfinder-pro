import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Search, CheckCircle, XCircle } from "lucide-react";
import { US_STATES } from "@/lib/dealScoring";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { toast } from "sonner";

export default function Compliance() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    state: "", state_name: "", third_party_recovery_legal: true,
    fee_cap_percent: "", fee_cap_notes: "", required_disclosures: "",
    waiting_period_days: "", notary_required: false, poa_restrictions: "",
    licensing_requirements: "", prohibited_practices: "", cancellation_rights: "",
    compliance_complexity: "medium",
  });
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ["compliance-rules"],
    queryFn: () => base44.entities.ComplianceRule.list("state", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRule.create({
      ...data,
      fee_cap_percent: data.fee_cap_percent ? parseFloat(data.fee_cap_percent) : undefined,
      waiting_period_days: data.waiting_period_days ? parseInt(data.waiting_period_days) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-rules"] });
      toast.success("Compliance rule added");
      setShowAdd(false);
    },
  });

  const filtered = rules.filter(r =>
    !search || r.state_name?.toLowerCase().includes(search.toLowerCase()) || r.state?.toLowerCase().includes(search.toLowerCase())
  );

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const complexityColor = {
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Center</h1>
          <p className="text-sm text-muted-foreground mt-1">State-by-state recovery compliance rules</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Rule</Button>
      </div>

      <DisclaimerBanner />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search state..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No compliance rules configured yet. Add state rules to ensure legal compliance.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(rule => (
            <Card key={rule.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{rule.state_name} ({rule.state})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={complexityColor[rule.compliance_complexity || "medium"]}>
                      {rule.compliance_complexity || "Medium"} complexity
                    </Badge>
                    {rule.third_party_recovery_legal ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Third-party recovery</span>
                  <span className="font-medium">{rule.third_party_recovery_legal ? "Legal" : "Restricted"}</span>
                </div>
                {rule.fee_cap_percent && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fee cap</span>
                    <span className="font-medium">{rule.fee_cap_percent}%</span>
                  </div>
                )}
                {rule.waiting_period_days > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Waiting period</span>
                    <span className="font-medium">{rule.waiting_period_days} days</span>
                  </div>
                )}
                {rule.notary_required && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Notary</span>
                    <span className="font-medium text-amber-500">Required</span>
                  </div>
                )}
                {rule.required_disclosures && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Required Disclosures</p>
                    <p className="text-xs">{rule.required_disclosures}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Compliance Rule</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={form.state} onValueChange={(v) => { update("state", v); const s = US_STATES.find(x => x.value === v); if (s) update("state_name", s.label); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Complexity</Label>
              <Select value={form.compliance_complexity} onValueChange={(v) => update("compliance_complexity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.third_party_recovery_legal} onCheckedChange={(v) => update("third_party_recovery_legal", v)} />
              <Label>Third-party recovery is legal</Label>
            </div>
            <div className="space-y-2"><Label>Fee Cap %</Label><Input type="number" value={form.fee_cap_percent} onChange={e => update("fee_cap_percent", e.target.value)} /></div>
            <div className="space-y-2"><Label>Waiting Period (days)</Label><Input type="number" value={form.waiting_period_days} onChange={e => update("waiting_period_days", e.target.value)} /></div>
            <div className="flex items-center gap-3 col-span-2">
              <Switch checked={form.notary_required} onCheckedChange={(v) => update("notary_required", v)} />
              <Label>Notary required</Label>
            </div>
            <div className="col-span-2 space-y-2"><Label>Required Disclosures</Label><Textarea value={form.required_disclosures} onChange={e => update("required_disclosures", e.target.value)} rows={2} /></div>
            <div className="col-span-2 space-y-2"><Label>POA Restrictions</Label><Textarea value={form.poa_restrictions} onChange={e => update("poa_restrictions", e.target.value)} rows={2} /></div>
            <div className="col-span-2 space-y-2"><Label>Licensing Requirements</Label><Textarea value={form.licensing_requirements} onChange={e => update("licensing_requirements", e.target.value)} rows={2} /></div>
            <div className="col-span-2 space-y-2"><Label>Prohibited Practices</Label><Textarea value={form.prohibited_practices} onChange={e => update("prohibited_practices", e.target.value)} rows={2} /></div>
            <div className="col-span-2 space-y-2"><Label>Cancellation Rights</Label><Textarea value={form.cancellation_rights} onChange={e => update("cancellation_rights", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.state}>Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
