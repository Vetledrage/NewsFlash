package app.repository

import app.model.Article
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

interface ArticleRepository : JpaRepository<Article, String> {
    fun findByUrl(url: String): Optional<Article>

    fun findTop50ByOrderByScrapedAtDesc(): List<Article>

    fun findBySourceIgnoreCase(source: String, pageable: Pageable): Page<Article>
}
