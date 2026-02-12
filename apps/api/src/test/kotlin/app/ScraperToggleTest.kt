package app

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.ApplicationContext
import kotlin.test.assertFalse

@SpringBootTest
class ScraperToggleTest(
    @Autowired private val applicationContext: ApplicationContext,
) {
    @Test
    fun `crawl job bean is not created when scraper is disabled in test profile`() {
        // CrawlJob is gated by @ConditionalOnProperty(scraper.enabled=true)
        assertFalse(applicationContext.containsBean("crawlJob"))
    }
}
