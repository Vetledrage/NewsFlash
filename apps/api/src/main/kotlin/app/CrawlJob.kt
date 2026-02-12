package app

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
    @Value("\${scraper.baseUrl}") private val baseUrl: String
) {
    @Scheduled(fixedDelayString = "PT10M")
    fun run() {
        crawler.crawlFrontPage(baseUrl, maxArticles = 60)
    }
}
