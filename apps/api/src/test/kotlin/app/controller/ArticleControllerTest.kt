package app.controller

import app.App
import app.model.Article
import app.repository.ArticleRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.time.LocalDateTime

@SpringBootTest(classes = [App::class])
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ArticleControllerTest(
    @Autowired private val mockMvc: MockMvc,
    @Autowired private val articleRepository: ArticleRepository,
) {
    @Test
    fun `GET by id returns 200 with dto when found`() {
        articleRepository.deleteAll()
        val now = LocalDateTime.now()
        val article = articleRepository.save(
            Article(
                articleId = "VG:test-article-1",
                url = "https://example.com/i/test-article-1/",
                title = "Test Article",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now,
                source = "VG",
                externalId = "test-article-1",
            )
        )

        mockMvc.get("/api/articles/${article.articleId}") {
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.articleId") { value("VG:test-article-1") }
                jsonPath("$.title") { value("Test Article") }
                jsonPath("$.source") { value("VG") }
            }
    }

    @Test
    fun `GET by id returns 404 when not found`() {
        articleRepository.deleteAll()
        mockMvc.get("/api/articles/does-not-exist") {
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    fun `paging size=1 returns 1 element`() {
        articleRepository.deleteAll()
        val base = LocalDateTime.now()
        articleRepository.save(
            Article(
                articleId = "VG:a1",
                url = "https://example.com/a1",
                title = "A1",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = base.minusHours(1),
                source = "VG",
                externalId = "a1",
            )
        )
        articleRepository.save(
            Article(
                articleId = "VG:a2",
                url = "https://example.com/a2",
                title = "A2",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = base,
                source = "VG",
                externalId = "a2",
            )
        )

        mockMvc.get("/api/articles") {
            param("page", "0")
            param("size", "1")
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.content.length()") { value(1) }
            }
    }

    @Test
    fun `source filter returns only matching source`() {
        articleRepository.deleteAll()
        val now = LocalDateTime.now()
        articleRepository.save(
            Article(
                articleId = "VG:only-vg",
                url = "https://example.com/vg",
                title = "VG article",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now,
                source = "VG",
                externalId = "only-vg",
            )
        )
        articleRepository.save(
            Article(
                articleId = "NRK:only-nrk",
                url = "https://example.com/nrk",
                title = "NRK article",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = now,
                source = "NRK",
                externalId = "only-nrk",
            )
        )

        mockMvc.get("/api/articles") {
            param("source", "VG")
            param("size", "20")
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.content.length()") { value(1) }
                jsonPath("$.content[0].source") { value("VG") }
            }
    }

    @Test
    fun `unknown sort field falls back to default scrapedAt desc`() {
        articleRepository.deleteAll()
        val base = LocalDateTime.now()
        articleRepository.save(
            Article(
                articleId = "VG:old",
                url = "https://example.com/old",
                title = "Old",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = base.minusDays(1),
                source = "VG",
                externalId = "old",
            )
        )
        articleRepository.save(
            Article(
                articleId = "VG:new",
                url = "https://example.com/new",
                title = "New",
                body = "This is a test article body with sufficient content to meet minimum length requirements",
                scrapedAt = base,
                source = "VG",
                externalId = "new",
            )
        )

        mockMvc.get("/api/articles") {
            param("size", "20")
            param("sort", "body,asc") // not allowed
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.content[0].articleId") { value("VG:new") }
            }
    }

    @Test
    fun `size is clamped to max 100`() {
        articleRepository.deleteAll()

        mockMvc.get("/api/articles") {
            param("size", "200")
            accept = MediaType.APPLICATION_JSON
        }
            .andExpect {
                status { isOk() }
                jsonPath("$.size") { value(100) }
            }
    }
}
