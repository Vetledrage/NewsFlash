"use client";

import * as React from "react";
import { motion } from "framer-motion";

export function ActionRail({
  liked,
  saved,
  onLike,
  onSave,
  onShare
}: {
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md items-center justify-between">
      <motion.button
        type="button"
        onClick={onLike}
        whileTap={{ scale: 0.9 }}
        animate={liked ? { scale: 1.08 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className="rounded-full px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
        aria-pressed={liked}
      >
        {liked ? "♥ Liked" : "♡ Like"}
      </motion.button>

      <button
        type="button"
        onClick={onShare}
        className="rounded-full px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
      >
        ↗ Share
      </button>

      <button
        type="button"
        onClick={onSave}
        className="rounded-full px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
        aria-pressed={saved}
      >
        {saved ? "✓ Saved" : "＋ Save"}
      </button>
    </div>
  );
}

