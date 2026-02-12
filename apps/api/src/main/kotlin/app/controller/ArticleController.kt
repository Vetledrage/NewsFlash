package app.controller

import app.dto.ArticleDto
import app.service.ArticleService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/articles")
class ArticleController(
    private val articleService: ArticleService,
) {
    @GetMapping
    fun getArticles(): List<ArticleDto> {
        return articleService.getLatestArticles()
    }
}
