package app.model

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZonedDateTime

@Entity
@Table(name = "articles")
class Article(

    @Id
    @Column(name = "article_id", nullable = false, updatable = false)
    var articleId: String,

    @Column(name = "url", nullable = false, length = 2000)
    var url: String,

    @Column(name = "title", nullable = false, length = 1000)
    var title: String,

    @Lob
    @Column(name = "body", nullable = false)
    var body: String,

    @Column(name = "scraped_at", nullable = false)
    var scrapedAt: LocalDateTime

)
