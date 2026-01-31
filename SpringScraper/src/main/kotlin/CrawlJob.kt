package org.example

import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class CrawlJob(
    private val crawler: Crawler,
    @Value("\${scraper.baseUrl}") private val baseUrl: String
) {
    @Scheduled(fixedDelayString = "PT10M")
    fun run() {
        crawler.crawlFrontPage(baseUrl, maxArticles = 60)
    }
}

