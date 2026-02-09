
import repository.ArticleRepository
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.beans.factory.annotation.Autowired
import java.time.Instant

@SpringBootTest
class ArticleRepositoryTest @Autowired constructor(
    val articleRepository: ArticleRepository
) {

    @Test
    fun `should save and load article`() {
        val article = Article(
            articleId = "test-1",
            url = "https://example.com/test",
            title = "Test Article",
            body = "This is a test article body.",
            scrapedAt = Instant.now()
        )

        // Save
        articleRepository.save(article)

        // Fetch
        val loaded = articleRepository.findById("test-1").orElseThrow()

        println("Loaded article from DB:")
        println("ID: ${loaded.articleId}")
        println("Title: ${loaded.title}")
        println("URL: ${loaded.url}")
        println("Body: ${loaded.body}")
        println("Scraped at: ${loaded.scrapedAt}")
    }
}
