import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/dealScoring";
import StatusBadge from "@/components/shared/StatusBadge";
import DealScoreBadge from "@/components/shared/DealScoreBadge";
import { MapPin, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "new_lead",          label: "Lead Found",        color: "border-blue-500/40",   headerColor: "bg-blue-500/10 text-blue-600" },
  { id: "needs_verification",label: "Verification",      color: "border-amber-500/40",  headerColor: "bg-amber-500/10 text-amber-600" },
  { id: "contacted",         label: "Outreach Started",  color: "border-purple-500/40", headerColor: "bg-purple-500/10 text-purple-600" },
  { id: "responded",         label: "Responded",         color: "border-cyan-500/40",   headerColor: "bg-cyan-500/10 text-cyan-600" },
  { id: "documents_sent",    label: "Docs Sent",         color: "border-indigo-500/40", headerColor: "bg-indigo-500/10 text-indigo-600" },
  { id: "agreement_signed",  label: "Signed",            color: "border-emerald-500/40",headerColor: "bg-emerald-500/10 text-emerald-600" },
  { id: "submitted_to_county", label: "Submitted",       color: "border-teal-500/40",   headerColor: "bg-teal-500/10 text-teal-600" },
  { id: "paid",              label: "Paid",              color: "border-green-500/40",  headerColor: "bg-green-500/10 text-green-700" },
];

export default function KanbanBoard({ records, onStatusChange }) {
  const navigate = useNavigate();

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = records.filter(r => r.status === col.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 280px)" }}>
        {COLUMNS.map((col) => (
          <div key={col.id} className={cn("flex-shrink-0 w-64 flex flex-col rounded-xl border-2 bg-muted/30", col.color)}>
            {/* Column header */}
            <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-lg", col.headerColor)}>
              <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
              <span className="text-xs font-semibold opacity-70">{grouped[col.id].length}</span>
            </div>

            {/* Drop zone */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 p-2 space-y-2 rounded-b-xl transition-colors",
                    snapshot.isDraggingOver && "bg-primary/5"
                  )}
                >
                  {grouped[col.id].map((record, index) => (
                    <Draggable key={record.id} draggableId={record.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => navigate(`/records/${record.id}`)}
                          className={cn(
                            "bg-card rounded-lg p-3 border border-border cursor-pointer select-none",
                            "hover:border-primary/40 hover:shadow-md transition-all",
                            snapshot.isDragging && "shadow-xl ring-2 ring-primary/30 rotate-1"
                          )}
                        >
                          <p className="text-sm font-semibold leading-tight mb-1 line-clamp-1">{record.owner_name}</p>
                          {record.property_address ? (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-2 line-clamp-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {record.property_address}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mb-2">{record.county}, {record.state}</p>
                          )}
                          {record.surplus_amount > 0 && (
                            <p className="text-xs font-bold text-primary flex items-center gap-1 mb-2">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(record.surplus_amount)}
                            </p>
                          )}
                          <DealScoreBadge score={record.deal_score || 0} label={record.deal_label} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {grouped[col.id].length === 0 && !snapshot.isDraggingOver && (
                    <div className="text-center py-6 text-xs text-muted-foreground/50">Drop here</div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}