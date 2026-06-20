"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Activity, ArrowUpRight, GitBranch, Radio, RefreshCw, Search, Sparkles } from "lucide-react";
import { Category, Source, TrendResponse } from "@/lib/types";
import { getTrends } from "@/lib/trends";

const sources: Source[] = ["Qiita", "Hacker News", "GitHub"];
const categories: Category[] = ["AI / ML", "Web", "Mobile", "Data", "DevOps", "Security", "Programming", "Developer Tools"];

export function Dashboard({ initialData }: { initialData: TrendResponse }) {
  const [data, setData] = useState(initialData);
  const [days, setDays] = useState(initialData.days);
  const [source, setSource] = useState<Source | "All">("All");
  const [category, setCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => data.items.filter((item) =>
    (source === "All" || item.source === source) &&
    (category === "All" || item.category === category) &&
    `${item.title} ${item.description ?? ""} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  ), [data, source, category, query]);

  const keywords = Object.entries(filtered.flatMap((item) => item.tags).reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);

  useEffect(() => {
    startTransition(async () => setData(await getTrends(7)));
  }, []);

  function changeDays(next: number) {
    setDays(next);
    startTransition(async () => {
      setData(await getTrends(next));
    });
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Activity size={20} /></span>TechPulse <b>Japan</b></a>
        <div className="live"><span /> LIVE DATA</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow"><Radio size={14} /> JAPAN × GLOBAL TECH INTELLIGENCE</p>
          <h1>技術の「今」を、<br /><em>ひとつの視点</em>で。</h1>
          <p className="lead">Qiita、Hacker News、GitHubの公開データを横断。日本と世界で動き始めた技術を、独自スコアで可視化します。</p>
        </div>
        <div className="hero-orbit"><div className="orbit ring-one" /><div className="orbit ring-two" /><div className="pulse-core"><Sparkles /><strong>{pending && !data.items.length ? "..." : data.items.length}</strong><span>SIGNALS</span></div></div>
      </section>

      <section className="controls">
        <div className="segmented">{[1, 7, 30].map((value) => <button className={days === value ? "active" : ""} onClick={() => changeDays(value)} key={value}>{value === 1 ? "24時間" : `${value}日間`}</button>)}</div>
        <label className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="技術、言語、キーワードを検索" /></label>
        <button className="refresh" onClick={() => changeDays(days)} aria-label="更新"><RefreshCw className={pending ? "spin" : ""} size={18} /></button>
      </section>

      <section className="content-grid">
        <div>
          <div className="section-title"><div><p>RANKING</p><h2>注目のトレンド</h2></div><span>{filtered.length}件</span></div>
          <div className="chips">{(["All", ...sources] as const).map((name) => <button className={source === name ? "active" : ""} onClick={() => setSource(name)} key={name}>{name}</button>)}</div>
          <div className="trend-list">{filtered.slice(0, 18).map((item, index) => (
            <a href={item.url} target="_blank" rel="noreferrer" className="trend-card" key={item.id}>
              <span className="rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="trend-main"><div className="trend-meta"><b data-source={item.source}>{item.source}</b><span>{item.category}</span><span>{new Date(item.publishedAt).toLocaleDateString("ja-JP")}</span></div><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}<div className="tag-row">{item.language && <b>{item.language}</b>}{item.tags.slice(0,3).map((tag) => <span key={tag}>#{tag}</span>)}</div></div>
              <div className="trend-score"><strong>{item.score}</strong><span>PULSE</span><ArrowUpRight size={18}/></div>
            </a>
          ))}{!filtered.length && <div className="empty">条件に一致するトレンドはありません。</div>}</div>
        </div>
        <aside>
          <article className="panel"><p>RISING KEYWORDS</p><h2>急上昇キーワード</h2><div className="keywords">{keywords.map(([word,count],i) => <button onClick={() => setQuery(word)} key={word}><span>{i+1}</span><b>{word}</b><em>{count}</em></button>)}</div></article>
          <article className="panel"><p>FILTER</p><h2>カテゴリ</h2><div className="category-buttons">{(["All", ...categories] as const).map((name) => <button className={category === name ? "active" : ""} onClick={() => setCategory(name)} key={name}><span>{name}</span><em>{name === "All" ? data.items.length : data.items.filter((item)=>item.category===name).length}</em></button>)}</div></article>
          <article className="method-card"><GitBranch size={22}/><h3>オープンデータから算出</h3><p>媒体ごとの反応数を0〜100に正規化。異なる指標を単純比較せず、各コミュニティ内の勢いを示します。</p></article>
        </aside>
      </section>
      <footer><b>TechPulse Japan</b><span>Public data from Qiita, Hacker News and GitHub.</span></footer>
    </main>
  );
}
