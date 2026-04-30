import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { DollarSign, Users, Shield, TrendingUp, AlertTriangle, FileText, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import DealScoreBadge from "@/components/shared/DealScoreBadge";
import DisclaimerBanner from "@/components/shared/DisclaimerBanner";
import { formatCurrency } from "@/lib/dealScoring";

export default function Dashboard() {
  const [syncing, setSyncing] = useState(false);
  const [leadsApiUrl, setLeadsApiUrl] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.settings?.leads_api_url) setLeadsApiUrl(user.settings.leads_api_url);
    }).catch(() => {});
  }, []);

  const { data: records = [] } = useQuery({
    queryKey: ["surplus-records"],
    queryFn: () => base44.entities.SurplusRecord.list("-created_date", 100),
  });

  const handleSync = async () => {
    if (!leadsApiUrl) {
      toast.error("Set your Leads API URL in Settings → Integrations first.");
      return;
    }
    setSyncing(true);
    const res = await base44.functions.invoke('syncLeads', { leads_api_url: leadsApiUrl });
    const { created, updated, skipped } = res.data;
    toast.success(`Sync complete: ${created} new, ${updated} updated, ${skipped} skipped`);
    queryClient.invalidateQueries({ queryKey: ["surplus-records"] });
    setSyncing(false);
  };

  const totalSurplus = records.reduce((sum, r) => sum + (r.surplus_amount || 0), 0);
  const activeLeads = records.filter(r => !["closed", "paid", "do_not_contact"].includes(r.status)).length;
  const paidCases = records.filter(r => r.status === "paid").length;
  const complianceBlocked = records.filter(r => r.deal_label === "compliance_review").length;

  const topLeads = [...records]
    .filter(r => r.surplus_amount && r.status !== "do_not_contact")
    .sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0))
    .slice(0, 8);

  const highValueLeads = [...records]
    .filter(r => r.surplus_amount)
    .sort((a, b) => (b.surplus_amount || 0) - (a.surplus_amount || 0))
    .slice(0, 5);

  const missingContact = records.filter(r => r.status === "new_lead" || r.status === "needs_verification");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Surplus fund recovery overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Leads"}
          </Button>
          <Link to="/records">
            <Button className="gap-2">
              <TrendingUp className="w-4 h-4" />
              View All Records
            </Button>
          </Link>
        </div>
      </div>

      <DisclaimerBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Surplus" value={formatCurrency(totalSurplus)} icon={DollarSign} subtitle={`${records.length} records`} />
        <StatCard title="Active Leads" value={activeLeads} icon={Users} subtitle="In progress" />
        <StatCard title="Paid Cases" value={paidCases} icon={TrendingUp} subtitle="Successfully recovered" />
        <StatCard title="Compliance Flags" value={complianceBlocked} icon={Shield} subtitle="Needs review" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Scored Leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Top Leads by Score</CardTitle>
              <Link to="/records" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No records yet. Add surplus records to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {topLeads.map((r) => (
                  <Link
                    key={r.id}
                    to={`/records/${r.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{r.owner_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.property_address || `${r.county}, ${r.state}`}</p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <DealScoreBadge score={r.deal_score || 0} label={r.deal_label} />
                      <span className="text-sm font-semibold text-primary whitespace-nowrap">
                        {formatCurrency(r.surplus_amount)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Highest Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highValueLeads.map((r) => (
                <Link
                  key={r.id}
                  to={`/records/${r.id}`}
                  className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{r.county}, {r.state}</p>
                  </div>
                  <span className="text-sm font-bold text-primary ml-2 whitespace-nowrap">
                    {formatCurrency(r.surplus_amount)}
                  </span>
                </Link>
              ))}
              {highValueLeads.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No records</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Missing contacts</span>
                  <span className="font-semibold">{missingContact.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Compliance blocked</span>
                  <span className="font-semibold text-amber-500">{complianceBlocked}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New leads</span>
                  <span className="font-semibold">{records.filter(r => r.status === "new_lead").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}