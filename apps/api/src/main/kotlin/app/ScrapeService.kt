package app

import app.model.Article
import app.repository.ArticleRepository
import app.sources.NewsSource
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class ScrapeService(
    private val repo: ArticleRepository,
    private val sources: List<NewsSource>,
) {
    private val log = LoggerFactory.getLogger(ScrapeService::class.java)

    fun scrapeAndSave(inputUrl: String) {
        val source = sources.firstOrNull { it.isArticleUrl(inputUrl) }
        if (source == null) {
            log.debug("Skipping URL with no matching source: {}", inputUrl)
            return
        }

        val externalId = source.extractExternalId(inputUrl)
        if (externalId == null) {
            log.debug("Skipping non-article URL for source {}: {}", source.sourceId, inputUrl)
            return
        }

        val scraped = source.scrape(inputUrl)
        if (scraped == null) {
            log.info("Skipping article {}:{} because scraping returned null: {}", source.sourceId, externalId, inputUrl)
            return
        }

        val articleId = "${source.sourceId}:$externalId"
        val summary = generateSummary(scraped.body)

        repo.save(
            Article(
                articleId = articleId,
                url = scraped.canonicalUrl.take(2000),
                title = scraped.title.take(1000),
                body = scraped.body,
                scrapedAt = LocalDateTime.now(),
                source = source.sourceId,
                externalId = externalId,
                summary = summary,
            )
        )

        log.info("Saved article {} ({})", articleId, scraped.canonicalUrl)
    }

    private fun generateSummary(body: String): String? = body.take(300).takeIf { it.isNotBlank() }
}
