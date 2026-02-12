package app.service

import app.dto.ArticleDto
import app.repository.ArticleRepository
import org.springframework.stereotype.Service

@Service
class ArticleService(
    private val articleRepository: ArticleRepository,
) {
    fun getLatestArticles(limit: Int = 50): List<ArticleDto> {
        // Keep it simple for now. We have a repository method for the default limit.
        val articles = if (limit == 50) {
            articleRepository.findTop50ByOrderByScrapedAtDesc()
        } else {
            // Fallback: fetch a bit more via default method and trim.
            articleRepository.findTop50ByOrderByScrapedAtDesc().take(limit)
        }

        return articles.map {
            ArticleDto(
                articleId = it.articleId,
                url = it.url,
                title = it.title,
                scrapedAt = it.scrapedAt,
                source = it.source,
                externalId = it.externalId,
            )
        }
    }
}
