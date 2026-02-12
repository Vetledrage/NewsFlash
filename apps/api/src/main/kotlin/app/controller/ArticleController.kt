package app.controller

import app.dto.ArticleDto
import app.service.ArticleService
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/articles")
class ArticleController(
    private val articleService: ArticleService,
) {
    @GetMapping("/{id}")
    fun getArticleById(@PathVariable id: String): ResponseEntity<ArticleDto> {
        val dto = articleService.getById(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(dto)
    }

    @GetMapping
    fun getArticles(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) source: String?,
        @RequestParam(required = false, name = "sort") sortParams: List<String>?,
    ): Page<ArticleDto> {
        val safeSize = size.coerceIn(1, 100)
        val sort = parseSpringLikeSort(sortParams) ?: Sort.by(Sort.Direction.DESC, "scrapedAt")
        val pageable = PageRequest.of(page.coerceAtLeast(0), safeSize, sort)
        return articleService.getArticles(pageable, source)
    }

    private fun parseSpringLikeSort(sortParams: List<String>?): Sort? {
        if (sortParams.isNullOrEmpty()) return null

        // Spring supports repeated sort params like: ?sort=title,asc&sort=scrapedAt,desc
        // We implement a minimal compatible parser (no custom API), then Service will whitelist fields.
        val orders = sortParams.mapNotNull { raw ->
            val parts = raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
            if (parts.isEmpty()) return@mapNotNull null
            val property = parts[0]
            val direction = parts.getOrNull(1)?.lowercase()
            val dir = if (direction == null) Sort.Direction.ASC else runCatching { Sort.Direction.fromString(direction) }.getOrNull()
                ?: return@mapNotNull null
            Sort.Order(dir, property)
        }

        return if (orders.isEmpty()) null else Sort.by(orders)
    }
}
