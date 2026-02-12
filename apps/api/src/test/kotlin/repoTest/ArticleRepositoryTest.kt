package repoTest

import app.model.Article
import app.repository.ArticleRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
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

    @Test
    fun `should page and filter by source ignoring case`() {
        articleRepository.deleteAll()
        val now = LocalDateTime.now()

        articleRepository.save(
            Article(
                articleId = "VG:paging-1",
                url = "https://example.com/p1",
                title = "P1",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now.minusMinutes(1),
                source = "VG",
                externalId = "paging-1",
            )
        )
        articleRepository.save(
            Article(
                articleId = "NRK:paging-2",
                url = "https://example.com/p2",
                title = "P2",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now,
                source = "NRK",
                externalId = "paging-2",
            )
        )
        articleRepository.save(
            Article(
                articleId = "VG:paging-3",
                url = "https://example.com/p3",
                title = "P3",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now,
                source = "VG",
                externalId = "paging-3",
            )
        )

        val pageable = PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "scrapedAt"))
        val page = articleRepository.findBySourceIgnoreCase("vg", pageable)

        assertEquals(1, page.content.size)
        assertEquals("VG", page.content[0].source)
        assertEquals(2, page.totalElements)
    }
}
