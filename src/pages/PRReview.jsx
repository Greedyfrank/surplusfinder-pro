import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitPullRequest, ExternalLink, RefreshCw, Search, MessageSquare, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PRReview() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchPRs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getGithubPRs", {});
      setPrs(res.data.prs || []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to fetch pull requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  const filtered = prs.filter((pr) => {
    const s = search.toLowerCase();
    return (
      !s ||
      pr.title.toLowerCase().includes(s) ||
      pr.repo.toLowerCase().includes(s) ||
      pr.author?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PR Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open pull requests across your repositories
          </p>
        </div>
        <Button variant="outline" onClick={fetchPRs} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, repo, or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <GitPullRequest className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No open pull requests found.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} open PR{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.map((pr) => (
            <Card key={`${pr.repo}-${pr.number}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={pr.author_avatar}
                    alt={pr.author}
                    className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{pr.repo}</span>
                          <span className="text-xs text-muted-foreground">#{pr.number}</span>
                          {pr.draft && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Draft</Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold mt-0.5 leading-snug">{pr.title}</p>
                        {pr.body && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pr.body}</p>
                        )}
                      </div>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <ExternalLink className="w-3 h-3" /> Review
                        </Button>
                      </a>
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        by <span className="font-medium text-foreground">{pr.author}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        updated {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
                      </span>
                      {(pr.comments + pr.review_comments) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          {pr.comments + pr.review_comments}
                        </span>
                      )}
                      {pr.labels.map((label) => (
                        <Badge key={label} variant="outline" className="text-xs">{label}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}