import repository.ArticleRepository
import org.jsoup.HttpStatusException
import org.jsoup.Jsoup
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.net.URI
import java.time.Instant
import kotlin.math.min


@Service
class ScrapeService(
    private val repo: ArticleRepository,
    @Value("\${scraper.baseUrl}") private val baseUrl: String,
    @Value("\${scraper.userAgent}") private val userAgent: String
) {
    private val log = LoggerFactory.getLogger(ScrapeService::class.java)

    fun scrapeAndSave(inputUrl: String) {
        val normalizedUrl = normalizeUrl(inputUrl)

        val articleId = extractArticleIdOrNull(normalizedUrl)
        if (articleId == null) {
            log.debug("Skipping non-article URL: {}", normalizedUrl)
            return
        }

        val doc = fetchWithRetry(normalizedUrl, maxAttempts = 3) ?: return

        val title =
            doc.selectFirst("h1")?.text()?.trim()
                ?: doc.selectFirst("meta[property=og:title]")?.attr("content")?.trim()
                ?: doc.selectFirst("title")?.text()?.trim()
                ?: "(no title)"

        val text =
            doc.selectFirst("article")?.text()?.trim()
                ?: doc.selectFirst("main")?.text()?.trim()
                ?: doc.body()?.text()?.trim()
                ?: ""

        // Skip pages that don't really contain content
        if (text.length < 200) {
            log.info("Skipping article {} because extracted text is too short ({} chars): {}", articleId, text.length, normalizedUrl)
            return
        }

        // Best-effort: prefer any canonical URL if present
        val canonical = doc.selectFirst("link[rel=canonical]")?.absUrl("href")?.takeIf { it.isNotBlank() }
        val savedUrl = canonical?.let { normalizeUrl(it) } ?: normalizedUrl

        repo.save(
            Article(
                articleId = articleId,
                url = savedUrl.take(2000),
                title = title.take(1000),
                body = text,
                scrapedAt = Instant.now()
            )
        )

        log.info("Saved article {} ({})", articleId, savedUrl)
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
                // 4xx usually won't succeed on retry, 5xx might
                val code = e.statusCode
                if (code in 400..499) {
                    log.warn("HTTP {} (no retry) for {}", code, url)
                    return null
                }
                log.warn("HTTP {} (attempt {}/{}) for {}", code, attempt, maxAttempts, url)
            } catch (e: Exception) {
                log.warn("Fetch failed (attempt {}/{}): {} — {}", attempt, maxAttempts, url, e.message)
            }

            // simple backoff: 250ms, 500ms, 1000ms...
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

    private fun extractArticleIdOrNull(url: String): String? {
        val regex = Regex(""".*/i/([^/]+)(/.*)?$""")
        return regex.find(url)?.groupValues?.get(1)
    }

    private fun normalizeUrl(url: String): String {
        return try {
            val uri = URI(url)

            // Drop fragment (#...)
            val scheme = uri.scheme ?: return url
            val authority = uri.authority ?: return url
            val path = uri.path ?: ""

            // Optionally drop common tracking parameters// add to build.gradle.kts (dependencies block)
            val query = uri.rawQuery
                ?.split("&")
                ?.mapNotNull { part ->
                    val idx = part.indexOf("=")
                    val key = if (idx >= 0) part.substring(0, idx) else part
                    val value = if (idx >= 0) part.substring(idx + 1) else ""
                    key to value
                }
                ?.filterNot { (k, _) ->
                    val key = k.lowercase()
                    key.startsWith("utm_") || key == "fbclid" || key == "gclid"
                }
                ?.joinToString("&") { (k, v) ->
                    if (v.isEmpty()) k else "$k=$v"
                }
                ?.takeIf { it.isNotBlank() }

            URI(scheme, authority, path, query, null).toString()
        } catch (e: Exception) {
            url
        }
    }
}
