# TikTok-Style Frontend Specification

## 1. Goal

Create a mobile-first, vertical-scroll, TikTok-inspired frontend for the NewsFlash app where users consume short-form news content in a fast, engaging, and addictive format.

The experience should feel:

* Fast
* Immersive
* Minimal
* Gesture-driven
* Content-focused

---

## 2. Core UX Concept

### Vertical Swipe Navigation

* Full-screen cards
* One article per screen
* Swipe up → Next article
* Swipe down → Previous article
* No visible pagination
* Infinite scroll behavior (lazy loaded)

### Full-Screen Layout

Each article occupies 100% of viewport height.

Structure:

```
----------------------------------
|                                  |
|        Background Media          |
|    (image / gradient / video)    |
|                                  |
|----------------------------------|
|  Source + Time                   |
|  Headline (large, bold)          |
|  2–4 line summary                |
|                                  |
|  [Read More]                     |
----------------------------------
|  Like  Share  Save  Comment      |
----------------------------------
```

---

## 3. Content Structure Per Card

Each card should display:

* 🔹 Source (top-left)
* 🕒 Published time ("2h ago")
* 📰 Headline (large, high contrast)
* ✍ Short AI summary (2–4 lines max)
* 🔘 Read More button
* ❤️ Like
* 🔁 Share
* 💾 Save

Optional:

* Category tag
* Sentiment indicator
* Trending badge

---

## 4. Interaction Design

### Gestures

* Swipe up/down → Navigate articles
* Tap right side → Next
* Tap left side → Previous
* Long press → Pause autoplay (if video support)

### Animations

* Smooth vertical slide transition
* Subtle fade-in text
* Spring animation on like
* Skeleton loading state while fetching

Target: 60fps smooth performance.

---

## 5. Technical Requirements

### Frontend Stack (Suggested)

* React / Next.js
* TailwindCSS (utility-first styling)
* Framer Motion (animations)
* React Query (data fetching + caching)

### State Management

* Current article index
* Cached articles list
* Optimistic like/save updates

### Performance

* Preload next 2–3 articles
* Lazy load media
* Use virtualization if needed
* Minimize re-renders

---

## 6. Data Flow

1. Fetch batch of articles (e.g. 10)
2. Render first full-screen card
3. When user reaches article 7 → prefetch next batch
4. Append to list
5. Continue infinite feed

API Example:

```
GET /api/articles?limit=10&cursor=abc123
```

Response:

```
{
  "articles": [...],
  "nextCursor": "xyz456"
}
```

---

## 7. Design Principles

* Minimal UI chrome
* Content is king
* Dark mode by default
* High contrast typography
* Large tap targets
* Thumb-friendly zones

Color Scheme:

* Background: Near-black
* Primary accent: Red or electric blue
* Text: White / light gray

Typography:

* Headline: Bold, large
* Body: Clean sans-serif
* Source: Small caps or subtle weight

---

## 8. Future Enhancements

* AI voice narration
* Auto-scroll mode
* Personalized feed
* Category filtering
* Swipe right → Deep dive mode
* Embedded short explainer videos

---

## 9. Non-Goals (For Now)

* Desktop-first layout
* Complex navigation menus
* Multi-column layouts
* Heavy sidebars

This should feel like a news-native TikTok experience — fast, focused, and addictive.
