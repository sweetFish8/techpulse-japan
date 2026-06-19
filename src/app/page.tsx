import { Dashboard } from "@/components/dashboard";
import { getTrends } from "@/lib/trends";

export const revalidate = 900;

export default async function Home() {
  return <Dashboard initialData={await getTrends(7)} />;
}
