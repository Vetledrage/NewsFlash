package app.sources

import java.time.Instant

interface NewsSource {
    val sourceId: String
    val baseUrl: String

    fun isArticleUrl(url: String): Boolean
    fun extractExternalId(url: String): String?

    /**
     * Fetch + parse the article at [url].
     * Returns null if the URL isn't scrapeable (e.g. missing content).
     */
    fun scrape(url: String): ScrapedArticle?
}

data class ScrapedArticle(
    val title: String,
    val body: String,
    val canonicalUrl: String,
    val publishedAt: Instant?,
)
