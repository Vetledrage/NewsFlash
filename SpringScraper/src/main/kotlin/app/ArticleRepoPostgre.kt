package app

import app.model.Article
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.time.temporal.ChronoUnit

@Repository
class ArticleRepoPostgre(private val namedParameterJdbcTemplate: NamedParameterJdbcTemplate) {
    fun insertArticle(article: Article) {
        val sql = """
            INSERT INTO articles (article_id, url, title, body, scraped_at)
            VALUES (:articleId, :url, :title, :body, :scrapedAt)
        """.trimIndent()

        val params = mapOf(
            "articleId" to article.articleId,
            "url" to article.url,
            "title" to article.title,
            "body" to article.body,
            "scrapedAt" to article.scrapedAt.truncatedTo(ChronoUnit.MILLIS)
        )

        namedParameterJdbcTemplate.update(sql, params)
    }
    fun getArticleByArticleId(articleId: String): Article {
        val sql = """
            SELECT article_id, url, title, body, scraped_at
            FROM articles
            WHERE article_id = :articleId
        """.trimIndent()

        val params = mapOf("articleId" to articleId)

        return namedParameterJdbcTemplate.query(sql, params) { rs, _ ->
                Article(
                    articleId = rs.getString("article_id"),
                    url = rs.getString("url"),
                    title = rs.getString("title"),
                    body = rs.getString("body"),
                    scrapedAt = rs.getTimestamp("scraped_at").toLocalDateTime()
                )
        }.firstOrNull() ?: throw NoSuchElementException("Article with ID $articleId not found")
    }
}
