package repoTest

import app.ArticleRepoPostgre
import app.model.Article
import app.repository.ArticleRepository
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.ContextConfiguration
import java.time.Instant
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit
import kotlin.test.assertNotNull

//@SpringBootTest(classes = [app.App::class])

@Import (ArticleRepoPostgre::class)
@JdbcTest
@ActiveProfiles("test")
@ContextConfiguration(classes = [app.App::class])
class ArticleRepositoryTest(
    @Autowired
    private val articleRepository: ArticleRepoPostgre,
    @Autowired
    private val flyway: Flyway,
    @Autowired
    private val jdbcTemplate: JdbcTemplate
) {
    @Test
    fun `should migrate flyway`() {
        flyway.migrate()
    }
    @Test
    fun `should save article`() {
        flyway.migrate()
        val article = Article(
            articleId = "test-article-1",
            url = "https://example.com/test",
            title = "Test Article",
            body = "This is a test article body",
            scrapedAt = LocalDateTime.now()
        )

        articleRepository.insertArticle(article)

      //  val found = articleRepository.findById(article.articleId).orElseThrow()
//
      //  assertEquals(article.title, found.title)
      //  assertEquals(article.body, found.body)
//
      //  println("Found article: ${found.title}")
    }
    @Test
    fun `should save and load`() {
        flyway.migrate()
        val article = Article(
            articleId = "test-article-2",
            url = "https://example.com/test2",
            title = "Test Article 2",
            body = "This is another test article body",
            scrapedAt = LocalDateTime.now()
        )

        articleRepository.insertArticle(article)
        val result = articleRepository.getArticleByArticleId("test-article-2")
        assertNotNull(result)
        assertEquals("Test Article 2", result.title)
        assertEquals("This is another test article body", result.body)
        assertEquals("test-article-2", result.articleId)
        assertEquals(article.body, result.body)
        assertEquals(article.scrapedAt.truncatedTo(ChronoUnit.MILLIS), result.scrapedAt)
    }
}
