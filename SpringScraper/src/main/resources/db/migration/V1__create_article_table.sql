CREATE TABLE article (
    article_id VARCHAR(255) PRIMARY KEY,
    url        VARCHAR(2000) NOT NULL,
    title      VARCHAR(1000) NOT NULL,
    body       TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL
);

