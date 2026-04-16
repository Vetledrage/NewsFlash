import { VerticalFeed } from '@/features/feed/VerticalFeed'

export default function FeedPage() {
  return <VerticalFeed pageSize={10} prefetchThreshold={3} />
}

