package app.dto

import java.time.LocalDateTime

data class ArticleDto(
    val articleId: String,
    val url: String,
    val title: String,
    val scrapedAt: LocalDateTime,
    val source: String,
    val externalId: String,
)
