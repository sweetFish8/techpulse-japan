import { Category, Source, TrendItem, TrendResponse } from "./types";

type QiitaItem = { id: string; title: string; url: string; created_at: string; stocks_count: number; likes_count: number; user: { id: string }; tags: { name: string }[] };
type HackerNewsItem = { objectID: string; title: string; url?: string; author: string; created_at: string; points?: number };
type GitHubItem = { id: number; name: string; full_name: string; html_url: string; created_at: string; stargazers_count: number; description: string | null; language: string | null; topics?: string[]; owner: { login: string } };

const terms: Record<Category, string[]> = {
  "AI / ML": ["ai", "llm", "machine learning", "deep learning", "生成ai", "人工知能", "pytorch", "tensorflow", "agent"],
  Web: ["web", "react", "next.js", "nextjs", "vue", "svelte", "javascript", "typescript", "frontend", "backend", "css"],
  Mobile: ["ios", "android", "swift", "swiftui", "kotlin", "flutter", "react native", "mobile"],
  Data: ["data", "データ", "sql", "database", "analytics", "bigquery", "dbt", "spark", "pandas"],
  DevOps: ["devops", "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "github actions", "cloud"],
  Security: ["security", "脆弱性", "セキュリティ", "cve", "auth", "zero trust"],
  Other: [],
};

function classify(text: string): Category {
  const normalized = text.toLowerCase();
  let best: Category = "Other";
  let count = 0;
  for (const [category, keywords] of Object.entries(terms) as [Category, string[]][]) {
    const matches = keywords.filter((word) => normalized.includes(word)).length;
    if (matches > count) {
      best = category;
      count = matches;
    }
  }
  return best;
}

function normalize(items: Omit<TrendItem, "score">[]): TrendItem[] {
  const groups = Map.groupBy(items, (item) => item.source);
  return items.map((item) => {
    const max = Math.max(...(groups.get(item.source) ?? []).map((entry) => entry.rawScore), 1);
    return { ...item, score: Math.round((item.rawScore / max) * 100) };
  });
}

async function fetchQiita(days: number): Promise<Omit<TrendItem, "score">[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const response = await fetch(`https://qiita.com/api/v2/items?page=1&per_page=10&query=created%3A%3E%3D${since}+stocks%3A%3E%3D1`, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Qiita: ${response.status}`);
  const data = await response.json();
  return data.map((item: QiitaItem) => {
    const tags = item.tags.map((tag: { name: string }) => tag.name);
    return { id: `qiita-${item.id}`, source: "Qiita" as Source, title: item.title, url: item.url, author: item.user.id, publishedAt: item.created_at, rawScore: item.stocks_count || item.likes_count || 0, category: classify(`${item.title} ${tags.join(" ")}`), tags: tags.slice(0, 5) };
  });
}

async function fetchHackerNews(days: number): Promise<Omit<TrendItem, "score">[]> {
  const timestamp = Math.floor((Date.now() - days * 86400000) / 1000);
  const response = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E${timestamp},points%3E5&hitsPerPage=40`, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Hacker News: ${response.status}`);
  const data = await response.json();
  return data.hits.map((item: HackerNewsItem) => ({ id: `hn-${item.objectID}`, source: "Hacker News" as Source, title: item.title, url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`, author: item.author, publishedAt: item.created_at, rawScore: item.points || 0, category: classify(item.title), tags: [] }));
}

async function fetchGitHub(days: number): Promise<Omit<TrendItem, "score">[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  const response = await fetch(`https://api.github.com/search/repositories?q=created:%3E=${since}+stars:%3E5&sort=stars&order=desc&per_page=40`, { headers, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`GitHub: ${response.status}`);
  const data = await response.json();
  return data.items.map((item: GitHubItem) => {
    const tags = item.topics ?? [];
    return { id: `github-${item.id}`, source: "GitHub" as Source, title: item.full_name, url: item.html_url, author: item.owner.login, publishedAt: item.created_at, rawScore: item.stargazers_count || 0, category: classify(`${item.name} ${item.description ?? ""} ${item.language ?? ""} ${tags.join(" ")}`), language: item.language, tags: tags.slice(0, 5), description: item.description };
  });
}

export async function getTrends(days: number): Promise<TrendResponse> {
  const sources: [Source, Promise<Omit<TrendItem, "score">[]>][] = [["Qiita", fetchQiita(days)], ["Hacker News", fetchHackerNews(days)], ["GitHub", fetchGitHub(days)]];
  const results = await Promise.allSettled(sources.map(([, request]) => request));
  const status = { Qiita: "error", "Hacker News": "error", GitHub: "error" } as TrendResponse["status"];
  const items: Omit<TrendItem, "score">[] = [];
  results.forEach((result, index) => {
    const source = sources[index][0];
    if (result.status === "fulfilled") {
      status[source] = "ok";
      items.push(...result.value);
    }
  });
  return { items: normalize(items).sort((a, b) => b.score - a.score), generatedAt: new Date().toISOString(), days, status };
}
