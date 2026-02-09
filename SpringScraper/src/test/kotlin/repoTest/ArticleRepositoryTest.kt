package repoTest

import app.model.Article
import app.repository.ArticleRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.Instant

@SpringBootTest(classes = [app.App::class])
@ActiveProfiles("test")
class ArticleRepositoryTest {

    @Autowired
    lateinit var articleRepository: ArticleRepository

    @Test
    fun `should save and load article`() {
        val article = Article(
            articleId = "test-article-1",
            url = "https://example.com/test",
            title = "Test Article",
            body = "This is a test article body",
            scrapedAt = Instant.now()
        )

        articleRepository.save(article)

        val found = articleRepository.findById(article.articleId).orElseThrow()

        assertEquals(article.title, found.title)
        assertEquals(article.body, found.body)

        println("Found article: ${found.title}")
    }
}
