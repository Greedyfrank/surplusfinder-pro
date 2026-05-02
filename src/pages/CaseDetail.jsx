import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import CaseHeader from "@/components/case/CaseHeader";
import CaseDetails from "@/components/case/CaseDetails";
import CaseContacts from "@/components/case/CaseContacts";
import CaseTimeline from "@/components/case/CaseTimeline";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { getSurplusRecordById } from "@/lib/records";
import { toast } from "sonner";

export default function CaseDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: record, isLoading: isLoadingRecord } = useQuery({
    queryKey: ["surplus-record", id],
    queryFn: () => getSurplusRecordById(id),
    enabled: !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => base44.entities.Contact.filter({ record_id: id }),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["case-notes", id],
    queryFn: () => base44.entities.CaseNote.filter({ record_id: id }, "-created_date"),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status) => base44.entities.SurplusRecord.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surplus-record", id] });
      queryClient.invalidateQueries({ queryKey: ["surplus-records"] });
      toast.success("Status updated");
    },
  });

  if (!record && isLoadingRecord) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CaseHeader record={record} onStatusChange={(s) => updateStatus.mutate(s)} />
      <DisclaimerBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CaseDetails record={record} />
          <CaseTimeline notes={notes} recordId={id} />
        </div>
        <div className="space-y-6">
          <CaseContacts contacts={contacts} recordId={id} />
        </div>
      </div>
    </div>
  );
}
