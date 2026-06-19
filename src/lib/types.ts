export type Source = "Qiita" | "Hacker News" | "GitHub";
export type Category = "AI / ML" | "Web" | "Mobile" | "Data" | "DevOps" | "Security" | "Other";

export type TrendItem = {
  id: string;
  source: Source;
  title: string;
  url: string;
  author: string;
  publishedAt: string;
  score: number;
  rawScore: number;
  category: Category;
  language?: string;
  tags: string[];
  description?: string;
};

export type TrendResponse = {
  items: TrendItem[];
  generatedAt: string;
  days: number;
  status: Record<Source, "ok" | "error">;
};
