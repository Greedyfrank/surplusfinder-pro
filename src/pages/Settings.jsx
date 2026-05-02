import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Building2, Key, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: "", user_name: "", phone: "", email: "", website: "",
    fee_percent: "", sms_template: "", email_template: "", letter_template: "",
    api_beenverified: "", api_pdl: "", api_lexisnexis: "", api_tloxp: "", api_clearbit: "",
    leads_api_url: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.settings) {
        setSettings(prev => ({ ...prev, ...user.settings }));
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ settings });
    toast.success("Settings saved");
    setSaving(false);
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your account and integrations</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company" className="gap-1"><Building2 className="w-3 h-3" />Company</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1"><Key className="w-3 h-3" />Integrations</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1"><FileText className="w-3 h-3" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2"><Label>Company Name</Label><Input value={settings.company_name} onChange={e => update("company_name", e.target.value)} placeholder="Your Company LLC" /></div>
                <div className="space-y-2"><Label>Your Name</Label><Input value={settings.user_name} onChange={e => update("user_name", e.target.value)} placeholder="John Doe" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={settings.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={settings.email} onChange={e => update("email", e.target.value)} placeholder="contact@company.com" /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={settings.website} onChange={e => update("website", e.target.value)} placeholder="https://company.com" /></div>
                <div className="space-y-2"><Label>Default Recovery Fee %</Label><Input type="number" value={settings.fee_percent} onChange={e => update("fee_percent", e.target.value)} placeholder="25" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Data Provider API Keys</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Connect lawful data providers for contact verification. You must have proper authorization and acknowledge lawful usage.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label>Leads API URL</Label>
                  <Input value={settings.leads_api_url} onChange={e => update("leads_api_url", e.target.value)} placeholder="https://your-server.com/api/leads" />
                  <p className="text-xs text-muted-foreground">Used by the "Sync Leads" button on the Dashboard to fetch and import new leads.</p>
                </div>
                <div className="border-t border-border pt-4" />
                {[
                  { key: "api_beenverified", label: "BeenVerified API Key", placeholder: "Enter API key..." },
                  { key: "api_pdl", label: "People Data Labs API Key", placeholder: "Enter API key..." },
                  { key: "api_lexisnexis", label: "LexisNexis API Key", placeholder: "Enter API key..." },
                  { key: "api_tloxp", label: "TLOxp API Key", placeholder: "Enter API key..." },
                  { key: "api_clearbit", label: "Clearbit API Key", placeholder: "Enter API key..." },
                ].map(api => (
                  <div key={api.key} className="space-y-2">
                    <Label>{api.label}</Label>
                    <Input type="password" value={settings[api.key]} onChange={e => update(api.key, e.target.value)} placeholder={api.placeholder} />
                  </div>
                ))}
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mt-4">
                  <p className="text-xs text-amber-600">
                    By entering API keys, you acknowledge that you will only use these services for lawful purposes and in compliance with all applicable laws and the provider's terms of service.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Message Templates</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Customize your outreach templates. Use [Owner Name], [Property Address], etc. as placeholders.</p>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="space-y-2"><Label>SMS Template</Label><Textarea value={settings.sms_template} onChange={e => update("sms_template", e.target.value)} rows={4} placeholder="Custom SMS template..." /></div>
              <div className="space-y-2"><Label>Email Template</Label><Textarea value={settings.email_template} onChange={e => update("email_template", e.target.value)} rows={8} placeholder="Custom email template..." /></div>
              <div className="space-y-2"><Label>Letter Template</Label><Textarea value={settings.letter_template} onChange={e => update("letter_template", e.target.value)} rows={12} placeholder="Custom letter template..." /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
