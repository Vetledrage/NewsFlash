package repoTest

import app.model.Article
import app.repository.ArticleRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.ContextConfiguration
import java.time.LocalDateTime

@DataJpaTest
@ActiveProfiles("test")
@ContextConfiguration(classes = [app.App::class])
class ArticleRepositoryTest(
    @Autowired
    private val articleRepository: ArticleRepository
) {
    @Test
    fun `should save and retrieve article`() {
        val article = Article(
            articleId = "VG:test-article-1",
            url = "https://example.com/i/test-article-1/",
            title = "Test Article",
            body = "This is a test article body with sufficient content to meet minimum length requirements",
            scrapedAt = LocalDateTime.now(),
            source = "VG",
            externalId = "test-article-1"
        )

        val saved = articleRepository.save(article)
        assert(saved.articleId == "VG:test-article-1")

        val found = articleRepository.findById(saved.articleId)
        assert(found.isPresent)

        val retrieved = found.get()
        assertEquals("VG:test-article-1", retrieved.articleId)
        assertEquals("Test Article", retrieved.title)
        assertEquals(
            "This is a test article body with sufficient content to meet minimum length requirements",
            retrieved.body
        )
        assertEquals("VG", retrieved.source)
        assertEquals("test-article-1", retrieved.externalId)
    }

    @Test
    fun `should enforce unique constraint on source and externalId`() {
        val article1 = Article(
            articleId = "VG:duplicate-test",
            url = "https://example.com/i/duplicate-test/",
            title = "Duplicate Test Article",
            body = "This is a test article body with sufficient content to meet minimum length requirements",
            scrapedAt = LocalDateTime.now(),
            source = "VG",
            externalId = "duplicate-test"
        )

        articleRepository.save(article1)

        val article2 = Article(
            articleId = "VG:duplicate-test-2",
            url = "https://example.com/i/duplicate-test-2/",
            title = "Another Article",
            body = "This is another test article body with sufficient content to meet minimum length requirements",
            scrapedAt = LocalDateTime.now(),
            source = "VG",
            externalId = "duplicate-test"
        )

        try {
            articleRepository.save(article2)
            articleRepository.flush()
            throw AssertionError("Expected DataIntegrityViolationException but no exception was thrown")
        } catch (e: org.springframework.dao.DataIntegrityViolationException) {
            assert(true)
        }
    }
}
