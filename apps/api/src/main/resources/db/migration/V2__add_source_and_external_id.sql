-- V2__add_source_and_external_id_to_articles.sql

ALTER TABLE articles
ADD COLUMN source VARCHAR(50) NOT NULL DEFAULT 'VG';

ALTER TABLE articles
ADD COLUMN external_id VARCHAR(255) NOT NULL DEFAULT '';

CREATE UNIQUE INDEX ux_articles_source_external_id
ON articles (source, external_id);
