# Current Entity Graph

This graph reflects the current database entities defined in `api/prisma/schema.prisma`, plus the derived SQL view used for review aggregates.

```mermaid
erDiagram
  Book {
    string id PK
    string title
    int priceCents
    string publisherId FK
    datetime createdAt
    datetime updatedAt
  }

  Author {
    string id PK
    string name
  }

  Publisher {
    string id PK
    string name UK
  }

  Genre {
    string id PK
    string name UK
  }

  User {
    string id PK
    string name
  }

  BookAuthor {
    string bookId PK
    string authorId PK
  }

  BookGenre {
    string bookId PK
    string genreId PK
  }

  BookFormat {
    string bookId PK
    enum format PK
  }

  Review {
    string id PK
    string userId FK
    string bookId FK
    int rating
    string text
    datetime createdAt
  }

  Order {
    string id PK
    string userId FK
    datetime createdAt
  }

  OrderItem {
    string orderId PK
    string bookId PK
    enum format PK
    int quantity
    int unitPriceCents
  }

  book_review_stats {
    string bookId
    int reviewCount
    decimal reviewMean
  }

  Publisher ||--o{ Book : publishes

  Book ||--o{ BookAuthor : has
  Author ||--o{ BookAuthor : links

  Book ||--o{ BookGenre : has
  Genre ||--o{ BookGenre : links

  Book ||--o{ BookFormat : has

  User ||--o{ Review : writes
  Book ||--o{ Review : receives

  User ||--o{ Order : places
  Order ||--o{ OrderItem : contains
  BookFormat ||--o{ OrderItem : references

  Book ||--o| book_review_stats : aggregates_to

```

## Notes

- `BookAuthor`, `BookGenre`, and `BookFormat` are join entities.
- `OrderItem` references `BookFormat` by composite key (`bookId`, `format`).
- `Review` enforces one review per user per book via unique (`userId`, `bookId`).
- `book_review_stats` is a SQL view derived from `Review` (not a Prisma model).
- `Format` enum values: `HARDCOVER`, `SOFTCOVER`, `AUDIOBOOK`, `EREADER`.
