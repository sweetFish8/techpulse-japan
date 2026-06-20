import { Category, Source, TrendItem, TrendResponse } from "./types";

type QiitaItem = { id: string; title: string; url: string; created_at: string; stocks_count: number; likes_count: number; user: { id: string }; tags: { name: string }[] };
type HackerNewsItem = { objectID: string; title: string; url?: string; author: string; created_at: string; points?: number };
type GitHubItem = { id: number; name: string; full_name: string; html_url: string; created_at: string; stargazers_count: number; description: string | null; language: string | null; topics?: string[]; owner: { login: string } };

const terms: Record<Category, string[]> = {
  "AI / ML": ["ai", "llm", "machine learning", "deep learning", "生成ai", "人工知能", "pytorch", "tensorflow", "claude", "openai", "agentic", "rag"],
  Web: ["web", "react", "next.js", "nextjs", "vue", "svelte", "javascript", "typescript", "frontend", "backend", "css", "browser", "html", "node.js"],
  Mobile: ["ios", "android", "swift", "swiftui", "kotlin", "flutter", "react native", "mobile", "iphone", "ipad"],
  Data: ["data", "データ", "sql", "database", "analytics", "bigquery", "dbt", "spark", "pandas", "postgres", "mysql"],
  DevOps: ["devops", "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "github actions", "cloud", "linux", "server"],
  Security: ["security", "脆弱性", "セキュリティ", "cve", "authentication", "zero trust", "malware", "privacy", "暗号"],
  Programming: ["programming", "プログラミング", "python", "rust", "go", "golang", "java", "c++", "ruby", "php", "compiler", "algorithm", "api"],
  "Developer Tools": ["developer", "開発", "tool", "cli", "editor", "vscode", "terminal", "github", "git", "open source", "オープンソース", "sdk", "framework", "library"],
};

function matches(text: string, keyword: string): boolean {
  if (/^[a-z0-9+#./ -]+$/i.test(keyword)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  }
  return text.includes(keyword);
}

function classify(text: string, fallback: Category): Category {
  const normalized = text.toLowerCase();
  let best = fallback;
  let count = 0;
  for (const [category, keywords] of Object.entries(terms) as [Category, string[]][]) {
    const score = keywords.filter((word) => matches(normalized, word)).length;
    if (score > count) {
      best = category;
      count = score;
    }
  }
  return best;
}

function isTechnical(text: string): boolean {
  return Object.values(terms).flat().some((keyword) => matches(text.toLowerCase(), keyword));
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
  const response = await fetch(`https://qiita.com/api/v2/items?page=1&per_page=100&query=created%3A%3E%3D${since}+stocks%3A%3E%3D1`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Qiita: ${response.status}`);
  const data = await response.json();
  return data.map((item: QiitaItem) => {
    const tags = item.tags.map((tag: { name: string }) => tag.name);
    return { id: `qiita-${item.id}`, source: "Qiita" as Source, title: item.title, url: item.url, author: item.user.id, publishedAt: item.created_at, rawScore: item.stocks_count || item.likes_count || 0, category: classify(`${item.title} ${tags.join(" ")}`, "Programming"), tags: tags.slice(0, 5) };
  });
}

async function fetchHackerNews(days: number): Promise<Omit<TrendItem, "score">[]> {
  const timestamp = Math.floor((Date.now() - days * 86400000) / 1000);
  const response = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i%3E${timestamp},points%3E5&hitsPerPage=100`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Hacker News: ${response.status}`);
  const data = await response.json();
  return data.hits
    .filter((item: HackerNewsItem) => isTechnical(item.title))
    .map((item: HackerNewsItem) => ({ id: `hn-${item.objectID}`, source: "Hacker News" as Source, title: item.title, url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`, author: item.author, publishedAt: item.created_at, rawScore: item.points || 0, category: classify(item.title, "Developer Tools"), tags: [] }));
}

async function fetchGitHub(days: number): Promise<Omit<TrendItem, "score">[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  const response = await fetch(`https://api.github.com/search/repositories?q=created:%3E=${since}+stars:%3E5&sort=stars&order=desc&per_page=100`, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`GitHub: ${response.status}`);
  const data = await response.json();
  return data.items.map((item: GitHubItem) => {
    const tags = item.topics ?? [];
    return { id: `github-${item.id}`, source: "GitHub" as Source, title: item.full_name, url: item.html_url, author: item.owner.login, publishedAt: item.created_at, rawScore: item.stargazers_count || 0, category: classify(`${item.name} ${item.description ?? ""} ${item.language ?? ""} ${tags.join(" ")}`, "Developer Tools"), language: item.language, tags: tags.slice(0, 5), description: item.description };
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
