package org.example

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "article")
class Article(
    @Id
@Column(name = "article_id", nullable = false)
var articleId: String,

@Column(nullable = false, length = 2000)
var url: String,

@Column(nullable = false, length = 1000)
var title: String,

@Lob
@Column(nullable = false)
var body: String,

@Column(nullable = false)
var scrapedAt: Instant = Instant.now()
)
