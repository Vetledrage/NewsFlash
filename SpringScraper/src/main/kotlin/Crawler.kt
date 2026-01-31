package org.example

import org.jsoup.Jsoup
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.net.URI

@Service
class Crawler(
    private val scrapeService: ScrapeService,
    @Value("\${scraper.userAgent}") private val userAgent: String
) {
    private val log = LoggerFactory.getLogger(Crawler::class.java)

    fun crawlFrontPage(startUrl: String, maxArticles: Int = 50) {
        val doc = Jsoup.connect(startUrl)
            .userAgent(userAgent)
            .timeout(15_000)
            .get()

        // Extract candidate links from the front page only
        val links = doc.select("a[href]")
            .mapNotNull { it.absUrl("href").takeIf { abs -> abs.isNotBlank() } }
            .filter { sameHost(startUrl, it) }
            .map { stripFragment(it) }
            .distinct()

        // Keep only links that look like article URLs (based on your ID pattern)
        val articleLinks = links
            .filter { extractArticleIdOrNull(it) != null }
            .take(maxArticles)

        log.info("Front page {} -> found {} article links (using {})", startUrl, articleLinks.size, maxArticles)

        articleLinks.forEach { url ->
            scrapeService.scrapeAndSave(url)
        }
    }

    private fun extractArticleIdOrNull(url: String): String? {
        val regex = Regex(""".*/i/([^/]+)(/.*)?$""")
        return regex.find(url)?.groupValues?.get(1)
    }

    private fun sameHost(baseUrl: String, url: String): Boolean {
        return try {
            URI(baseUrl).host.equals(URI(url).host, ignoreCase = true)
        } catch (_: Exception) {
            false
        }
    }

    private fun stripFragment(url: String): String {
        val idx = url.indexOf('#')
        return if (idx >= 0) url.substring(0, idx) else url
    }
}
