package app

import app.sources.NewsSource
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(
    name = ["scraper.enabled"],
    havingValue = "true",
    matchIfMissing = false
)
class CrawlJob(
    private val crawler: Crawler,
    private val sources: List<NewsSource>,
    @Value("\${scraper.sources:VG}") private val enabledSourcesRaw: String,
) {
    @Scheduled(fixedDelayString = "PT10M")
    fun run() {
        val enabled = enabledSourcesRaw
            .split(',')
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toSet()

        val toCrawl = sources.filter { it.sourceId in enabled }
        toCrawl.forEach { source ->
            crawler.crawlFrontPage(source, maxArticles = 60)
        }
    }
}
