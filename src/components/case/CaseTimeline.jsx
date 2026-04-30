import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, StickyNote, ArrowRightLeft, MessageSquare, FileText, CheckSquare, Phone, Shield } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const typeConfig = {
  note: { icon: StickyNote, color: "text-blue-500", bg: "bg-blue-500/10" },
  status_change: { icon: ArrowRightLeft, color: "text-purple-500", bg: "bg-purple-500/10" },
  outreach: { icon: MessageSquare, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  document: { icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  task: { icon: CheckSquare, color: "text-amber-500", bg: "bg-amber-500/10" },
  contact_log: { icon: Phone, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  compliance: { icon: Shield, color: "text-orange-500", bg: "bg-orange-500/10" },
};

export default function CaseTimeline({ notes, recordId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    await base44.entities.CaseNote.create({
      record_id: recordId, type, title, content,
    });
    queryClient.invalidateQueries({ queryKey: ["case-notes", recordId] });
    toast.success("Entry added");
    setShowAdd(false);
    setTitle("");
    setContent("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Timeline</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1">
            <Plus className="w-3 h-3" /> Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="contact_log">Contact Log</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Details..." value={content} onChange={e => setContent(e.target.value)} rows={2} />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!title}>Save</Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No timeline entries yet</p>
          )}
          {notes.map(note => {
            const config = typeConfig[note.type] || typeConfig.note;
            const Icon = config.icon;
            return (
              <div key={note.id} className="flex gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{note.title}</p>
                  {note.content && <p className="text-xs text-muted-foreground mt-0.5">{note.content}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(note.created_date), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}