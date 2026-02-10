CREATE TABLE articles (
    article_id VARCHAR(255) PRIMARY KEY,
    url VARCHAR(2000) NOT NULL,
    title VARCHAR(1000) NOT NULL,
    body CLOB NOT NULL,
    scraped_at TIMESTAMP(6) NOT NULL
);
