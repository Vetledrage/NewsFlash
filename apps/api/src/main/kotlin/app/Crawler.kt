package app

import app.sources.NewsSource
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

    fun crawlFrontPage(source: NewsSource, maxArticles: Int = 50) {
        val startUrl = source.baseUrl
        val doc = Jsoup.connect(startUrl)
            .userAgent(userAgent)
            .timeout(15_000)
            .get()

        val links = doc.select("a[href]")
            .mapNotNull { it.absUrl("href").takeIf { abs -> abs.isNotBlank() } }
            .filter { sameHost(startUrl, it) }
            .map { stripFragment(it) }
            .distinct()

        val articleLinks = links
            .filter { source.extractExternalId(it) != null }
            .take(maxArticles)

        log.info(
            "Front page {} ({}) -> found {} article links (using {})",
            startUrl,
            source.sourceId,
            articleLinks.size,
            maxArticles
        )

        articleLinks.forEach { url ->
            scrapeService.scrapeAndSave(url)
        }
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
