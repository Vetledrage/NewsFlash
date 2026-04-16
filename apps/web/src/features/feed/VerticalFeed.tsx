"use client";

import * as React from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { fetchArticlesPage } from "@/lib/api/articles";
import type { Article, SpringPage } from "@/lib/types";
import { ArticleCard } from "@/features/feed/components/ArticleCard";
import { SkeletonCard } from "@/features/feed/components/SkeletonCard";

type Props = {
  pageSize: number;
  prefetchThreshold?: number; // items remaining before we fetch next page
  source?: string;
};

function flatten(pages: SpringPage<Article>[]) {
  return pages.flatMap((p) => p.content);
}

export function VerticalFeed({ pageSize, prefetchThreshold = 3, source }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number>(0);

  const query = useInfiniteQuery<SpringPage<Article>, Error, InfiniteData<SpringPage<Article>>, ["articles", { pageSize: number; source?: string }], number>({
    queryKey: ["articles", { pageSize, source }],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchArticlesPage({
        page: pageParam,
        size: pageSize,
        source,
        sort: ["scrapedAt,desc"]
      }),
    getNextPageParam: (lastPage: SpringPage<Article>) => {
      const next = lastPage.number + 1;
      return next < lastPage.totalPages ? next : undefined;
    }
  });

  const articles = React.useMemo<Article[]>(() => flatten(query.data?.pages ?? []), [query.data]);

  React.useEffect(() => {
    const remaining = articles.length - 1 - activeIndex;
    if (remaining <= prefetchThreshold && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [activeIndex, articles.length, prefetchThreshold, query]);

  const onScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0) return;
    const nextIndex = Math.round(el.scrollTop / h);
    setActiveIndex((prev: number) => (prev === nextIndex ? prev : nextIndex));
  }, []);

  const onTap = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const w = rect.width;
      const goPrev = x < w * 0.45;
      const goNext = x > w * 0.55;
      if (!goPrev && !goNext) return;

      const target = goPrev
        ? Math.max(0, activeIndex - 1)
        : Math.min(articles.length - 1, activeIndex + 1);
      el.scrollTo({ top: target * el.clientHeight, behavior: "smooth" });
    },
    [activeIndex, articles.length]
  );

  const content = (() => {
    if (query.isLoading) {
      return (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      );
    }

    if (query.isError) {
      return (
        <div className="h-full w-full grid place-items-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold">Could not load articles</p>
            <p className="mt-2 text-sm text-white/70">Try refreshing.</p>
          </div>
        </div>
      );
    }

    if (articles.length === 0) {
      return (
        <div className="h-full w-full grid place-items-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold">No articles yet</p>
            <p className="mt-2 text-sm text-white/70">Check back soon.</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {articles.map((a: Article, idx: number) => (
          <ArticleCard key={a.articleId} article={a} isActive={idx === activeIndex} />
        ))}
        {query.isFetchingNextPage ? <SkeletonCard /> : null}
      </>
    );
  })();

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      onClick={onTap}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth overscroll-contain touch-pan-y"
    >
      {content}
    </div>
  );
}
