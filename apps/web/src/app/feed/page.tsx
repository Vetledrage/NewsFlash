import { VerticalFeed } from "@/features/feed/VerticalFeed";

export default function FeedPage() {
  return (
    <main className="h-dvh w-screen">
      <VerticalFeed pageSize={10} prefetchThreshold={3} />
    </main>
  );
}

