import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

  // First, get the authenticated user's repos
  const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!reposRes.ok) {
    const err = await reposRes.text();
    return Response.json({ error: `GitHub API error: ${err}` }, { status: reposRes.status });
  }

  const repos = await reposRes.json();

  // Fetch open PRs from all repos (in parallel, limit to top 20 repos by activity)
  const topRepos = repos.slice(0, 20);

  const prResults = await Promise.all(
    topRepos.map(async (repo) => {
      const prRes = await fetch(`https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=10`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!prRes.ok) return [];
      const prs = await prRes.json();
      return prs.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        repo: repo.full_name,
        repo_url: repo.html_url,
        author: pr.user?.login,
        author_avatar: pr.user?.avatar_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        url: pr.html_url,
        labels: pr.labels?.map((l) => l.name) || [],
        draft: pr.draft,
        comments: pr.comments,
        review_comments: pr.review_comments,
      }));
    })
  );

  const allPRs = prResults.flat().sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );

  return Response.json({ prs: allPRs });
});