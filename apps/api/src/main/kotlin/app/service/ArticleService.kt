package app.service

import app.dto.ArticleDto
import app.model.Article
import app.repository.ArticleRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
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

        return articles.map { it.toDto() }
    }

    fun getById(id: String): ArticleDto? {
        return articleRepository.findById(id).orElse(null)?.toDto()
    }

    fun getArticles(pageable: Pageable, source: String?): Page<ArticleDto> {
        val safePageable = withSafeSort(pageable)
        val page = if (!source.isNullOrBlank()) {
            articleRepository.findBySourceIgnoreCase(source, safePageable)
        } else {
            articleRepository.findAll(safePageable)
        }

        return page.map { it.toDto() }
    }

    private fun withSafeSort(pageable: Pageable): Pageable {
        val allowed = setOf("scrapedAt", "title", "source")
        val hasAllowedSort = pageable.sort.any { it.property in allowed }

        val defaultSort = Sort.by(
            Sort.Order.desc("scrapedAt"),
            Sort.Order.desc("articleId"),
        )

        val safeSort = if (pageable.sort.isUnsorted || !hasAllowedSort) {
            defaultSort
        } else {
            // Keep only allowed properties; ignore the rest.
            val safeOrders = pageable.sort.filter { it.property in allowed }.toList()
            if (safeOrders.isEmpty()) {
                defaultSort
            } else {
                Sort.by(safeOrders)
            }
        }

        return PageRequest.of(pageable.pageNumber, pageable.pageSize, safeSort)
    }

    private fun Article.toDto(): ArticleDto = ArticleDto(
        articleId = articleId,
        url = url,
        title = title,
        scrapedAt = scrapedAt,
        source = source,
        externalId = externalId,
        summary = summary,
    )
}
