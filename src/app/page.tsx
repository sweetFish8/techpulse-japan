import { Dashboard } from "@/components/dashboard";
import { TrendResponse } from "@/lib/types";

const initialData: TrendResponse = {
  items: [],
  generatedAt: "",
  days: 7,
  status: { Qiita: "error", "Hacker News": "error", GitHub: "error" },
};

export default function Home() {
  return <Dashboard initialData={initialData} />;
}
