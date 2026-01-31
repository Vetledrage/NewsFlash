package org.example

import org.springframework.data.jpa.repository.JpaRepository

interface ArticleRepo : JpaRepository<Article, String>
