package app

import app.model.Article
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class ArticleRepoPostgre(private val namedParameterJdbcTemplate: NamedParameterJdbcTemplate) {
    fun insertArticle(article: Article) {
        val sql = """
            INSERT INTO article (article_id, url, title, body, scraped_at)
            VALUES (:articleId, :url, :title, :body, :scrapedAt)
        """.trimIndent()

        val params = mapOf(
            "articleId" to article.articleId,
            "url" to article.url,
            "title" to article.title,
            "body" to article.body,
            "scrapedAt" to article.scrapedAt
        )

        namedParameterJdbcTemplate.update(sql, params)
    }
}
