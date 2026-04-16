"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Article } from "@/lib/types";
import { timeAgo } from "@/lib/utils/time";
import { ActionRail } from "@/features/feed/components/ActionRail";
import { saveArticle } from "@/app/actions/articles";
import { ShareToDmModal } from "@/components/dms/ShareToDmModal";

export function ArticleCard({
  article,
  isActive
}: {
  article: Article;
  isActive: boolean;
}) {
  const [liked, setLiked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    const res = await saveArticle({
      articleUrl: article.url,
      articleTitle: article.title,
      articleSummary: article.summary,
      articleImageUrl: article.imageUrl,
      sourceName: article.source,
      externalArticleId: article.externalId,
    });
    if (!res.error) setSaved(true);
    setSaving(false);
  };

  const summary =
    article.summary ??
    "A short summary will appear here once the backend provides AI summaries. For now, tap Read more to open the source.";

  return (
    <section
      className="relative h-full w-full snap-start overflow-hidden bg-bg"
      aria-label={article.title}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px circle at 20% 20%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(900px circle at 80% 30%, rgba(239,68,68,0.14), transparent 45%), linear-gradient(180deg, #07080b 0%, #0b0c10 60%, #07080b 100%)"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />

      {/* Top meta */}
      <div className="relative z-10 p-5 pt-10">
        <div className="flex items-center gap-2 text-xs tracking-wide text-white/80">
          <span className="rounded-full bg-white/10 px-2 py-1 font-medium uppercase">
            {article.source}
          </span>
          <span className="text-white/60">·</span>
          <span className="text-white/60">{timeAgo(article.scrapedAt)}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex h-[calc(100%-160px)] flex-col justify-end px-5 pb-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.85, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-3xl font-bold leading-tight text-white drop-shadow"
        >
          {article.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mt-3 line-clamp-4 text-sm leading-relaxed text-white/80"
        >
          {summary}
        </motion.p>

        <div className="mt-5">
          <Link
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/15"
          >
            Read more
          </Link>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
        <ActionRail
          liked={liked}
          saved={saved}
          onLike={() => setLiked((v) => !v)}
          onSave={handleSave}
          onShare={() => setShowShare(true)}
        />
      </div>

      {showShare && (
        <ShareToDmModal
          open={showShare}
          onClose={() => setShowShare(false)}
          article={{
            url: article.url,
            title: article.title,
            summary: article.summary,
            imageUrl: article.imageUrl,
            source: article.source,
            externalId: article.externalId,
          }}
        />
      )}
    </section>
  );
}
