package app.sources

import org.jsoup.HttpStatusException
import org.jsoup.Jsoup
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.net.URI
import kotlin.math.min

@Component
class VgSource(
    @Value("\${scraper.userAgent}") private val userAgent: String,
) : NewsSource {

    override val sourceId: String = "VG"
    override val baseUrl: String = "https://www.vg.no/"

    private val log = LoggerFactory.getLogger(VgSource::class.java)

    override fun isArticleUrl(url: String): Boolean = extractExternalId(url) != null

    override fun extractExternalId(url: String): String? {
        val regex = Regex(""".*/i/([^/]+)(/.*)?$""")
        return regex.find(url)?.groupValues?.get(1)
    }

    override fun scrape(url: String): ScrapedArticle? {
        val normalizedUrl = normalizeUrl(url)
        val doc = fetchWithRetry(normalizedUrl, maxAttempts = 3) ?: return null

        val title =
            doc.selectFirst("h1")?.text()?.trim()
                ?: doc.selectFirst("meta[property=og:title]")?.attr("content")?.trim()
                ?: doc.selectFirst("title")?.text()?.trim()
                ?: return null

        val text =
            doc.selectFirst("article")?.text()?.trim()
                ?: doc.selectFirst("main")?.text()?.trim()
                ?: doc.body().text().trim()

        if (text.length < 200) return null

        val canonical = doc.selectFirst("link[rel=canonical]")
            ?.absUrl("href")
            ?.takeIf { it.isNotBlank() }
        val canonicalUrl = canonical?.let { normalizeUrl(it) } ?: normalizedUrl

        return ScrapedArticle(
            title = title,
            body = text,
            canonicalUrl = canonicalUrl,
            publishedAt = null,
        )
    }

    private fun fetchWithRetry(url: String, maxAttempts: Int): org.jsoup.nodes.Document? {
        var attempt = 1
        while (attempt <= maxAttempts) {
            try {
                return Jsoup.connect(url)
                    .userAgent(userAgent)
                    .timeout(15_000)
                    .followRedirects(true)
                    .get()
            } catch (e: HttpStatusException) {
                val code = e.statusCode
                if (code in 400..499) {
                    log.warn("HTTP {} (no retry) for {}", code, url)
                    return null
                }
                log.warn("HTTP {} (attempt {}/{}) for {}", code, attempt, maxAttempts, url)
            } catch (e: Exception) {
                log.warn("Fetch failed (attempt {}/{}): {} — {}", attempt, maxAttempts, url, e.message)
            }

            val sleepMs = min(1000L, 250L * (1L shl (attempt - 1)))
            try {
                Thread.sleep(sleepMs)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                return null
            }

            attempt++
        }

        log.warn("Giving up after {} attempts for {}", maxAttempts, url)
        return null
    }

    private fun normalizeUrl(url: String): String {
        return try {
            val uri = URI(url)
            val scheme = uri.scheme ?: return url
            val authority = uri.authority ?: return url
            val path = uri.path ?: ""

            val query = uri.rawQuery
                ?.split("&")
                ?.map { part ->
                    val idx = part.indexOf("=")
                    val key = if (idx >= 0) part.substring(0, idx) else part
                    val value = if (idx >= 0) part.substring(idx + 1) else ""
                    key to value
                }
                ?.filterNot { (k, _) ->
                    val key = k.lowercase()
                    key.startsWith("utm_") || key == "fbclid" || key == "gclid"
                }
                ?.joinToString("&") { (k, v) -> if (v.isEmpty()) k else "$k=$v" }
                ?.takeIf { it.isNotBlank() }

            URI(scheme, authority, path, query, null).toString()
        } catch (_: Exception) {
            url
        }
    }
}
