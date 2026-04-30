import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Mail, FileText, Send, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { format } from "date-fns";
import { toast } from "sonner";

const smsTemplate = `Hi [Owner Name], this is [User Name] with [Company]. Public records indicate possible surplus funds tied to [Property Address]. We are not a government agency, and you may be able to claim funds yourself. We offer recovery services if you'd like assistance. Reply STOP to opt out.`;
const emailTemplate = `Dear [Owner Name],\n\nI am writing to inform you that public records indicate there may be surplus funds available related to the property at [Property Address].\n\nPlease note:\n- We are NOT a government agency\n- You may be able to claim these funds independently\n- We offer optional recovery assistance services\n- There is no obligation to use our services\n\nIf you would like to learn more, please don't hesitate to reach out.\n\nSincerely,\n[User Name]\n[Company]\n[Phone]\n[Email]\n\nTo unsubscribe from future communications, reply with UNSUBSCRIBE.`;
const letterTemplate = `[Date]\n\n[Owner Name]\n[Owner Address]\n\nRe: Possible Surplus Funds — [Property Address]\nParcel/APN: [Parcel/APN]\nCounty: [County], [State]\n\nDear [Owner Name],\n\nPublic records indicate that surplus funds may exist following a recent property sale at the address listed above.\n\nIMPORTANT DISCLOSURES:\n• We are NOT a government agency or affiliated with any government entity.\n• You may be entitled to claim these funds directly at no cost.\n• Our company provides optional recovery assistance services.\n• There is no guarantee of recovery.\n\nIf you would like assistance, please contact us at:\n[Company]\n[Phone] | [Email]\n[Website]\n\nSincerely,\n\n[User Name]\n[Company]`;

const statusConfig = {
  draft: { color: "bg-gray-500/10 text-gray-500", icon: FileText },
  pending_approval: { color: "bg-amber-500/10 text-amber-600", icon: Clock },
  approved: { color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
  sent: { color: "bg-blue-500/10 text-blue-600", icon: Send },
  failed: { color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
  opted_out: { color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
};

export default function Outreach() {
  const [selectedRecord, setSelectedRecord] = useState("");
  const [type, setType] = useState("sms");
  const [subject, setSubject] = useState("Possible Surplus Funds Available");
  const [body, setBody] = useState(smsTemplate);
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ["surplus-records"],
    queryFn: () => base44.entities.SurplusRecord.list("-created_date", 200),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["outreach-messages"],
    queryFn: () => base44.entities.OutreachMessage.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OutreachMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-messages"] });
      toast.success("Message saved as draft — requires approval before sending");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.OutreachMessage.update(id, { status: "approved", approved_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-messages"] });
      toast.success("Message approved");
    },
  });

  const handleTypeChange = (t) => {
    setType(t);
    if (t === "sms") setBody(smsTemplate);
    else if (t === "email") setBody(emailTemplate);
    else setBody(letterTemplate);
  };

  const handleCreate = () => {
    if (!selectedRecord) { toast.error("Please select a record"); return; }
    createMutation.mutate({
      record_id: selectedRecord,
      type,
      subject: type === "email" ? subject : undefined,
      body,
      status: "pending_approval",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Outreach Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate compliant outreach messages</p>
      </div>
      <DisclaimerBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Compose Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Record</Label>
                  <Select value={selectedRecord} onValueChange={setSelectedRecord}>
                    <SelectTrigger><SelectValue placeholder="Choose a record" /></SelectTrigger>
                    <SelectContent>
                      {records.filter(r => r.status !== "do_not_contact").map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.owner_name} — {r.county}, {r.state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Tabs value={type} onValueChange={handleTypeChange}>
                    <TabsList className="w-full">
                      <TabsTrigger value="sms" className="flex-1 gap-1"><MessageSquare className="w-3 h-3" />SMS</TabsTrigger>
                      <TabsTrigger value="email" className="flex-1 gap-1"><Mail className="w-3 h-3" />Email</TabsTrigger>
                      <TabsTrigger value="letter" className="flex-1 gap-1"><FileText className="w-3 h-3" />Letter</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              {type === "email" && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)} rows={type === "letter" ? 18 : type === "email" ? 14 : 6} className="font-mono text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Messages require manual approval before sending
                </p>
                <Button onClick={handleCreate} className="gap-2">
                  <Send className="w-4 h-4" /> Save & Submit for Approval
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>}
              {messages.slice(0, 15).map(msg => {
                const sc = statusConfig[msg.status] || statusConfig.draft;
                return (
                  <div key={msg.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={sc.color + " border text-xs"}>
                        {msg.status?.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{msg.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.body?.slice(0, 100)}...</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">{format(new Date(msg.created_date), "MMM d, yyyy")}</p>
                      {msg.status === "pending_approval" && (
                        <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => approveMutation.mutate(msg.id)}>
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}