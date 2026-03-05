CREATE OR REPLACE VIEW "book_review_stats" AS
SELECT
  "bookId",
  COUNT(*)::int AS "reviewCount",
  AVG("rating")::numeric(10,4) AS "reviewMean"
FROM "Review"
GROUP BY "bookId";
