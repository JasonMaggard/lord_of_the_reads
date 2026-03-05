require('dotenv/config');

const { PrismaClient, Format } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run prisma/seed.js');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOOK_COUNT = 120;
const AUTHOR_COUNT = 80;
const PUBLISHER_COUNT = 12;
const USER_COUNT = 140;

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'DIY',
  'Self-Help',
  'Comedy',
  'Horror',
  'Drama',
  'Sci-Fi',
  'Fantasy',
  'Romance',
  'Literature',
];

const FORMAT_ROTATIONS = [
  [Format.HARDCOVER, Format.SOFTCOVER],
  [Format.SOFTCOVER, Format.EREADER],
  [Format.HARDCOVER, Format.EREADER, Format.AUDIOBOOK],
  [Format.SOFTCOVER, Format.AUDIOBOOK],
];

function id(prefix, index) {
  return `${prefix}_${String(index).padStart(4, '0')}`;
}

function buildPublishers() {
  return Array.from({ length: PUBLISHER_COUNT }, (_, index) => ({
    id: id('publisher', index + 1),
    name: `Publisher ${index + 1}`,
  }));
}

function buildAuthors() {
  return Array.from({ length: AUTHOR_COUNT }, (_, index) => ({
    id: id('author', index + 1),
    name: `Author ${index + 1}`,
  }));
}

function buildGenres() {
  return GENRES.map((name, index) => ({
    id: id('genre', index + 1),
    name,
  }));
}

function buildUsers() {
  return Array.from({ length: USER_COUNT }, (_, index) => ({
    id: id('user', index + 1),
    name: `Reader ${index + 1}`,
  }));
}

function buildBooks(publishers) {
  return Array.from({ length: BOOK_COUNT }, (_, index) => {
    const bookIndex = index + 1;
    return {
      id: id('book', bookIndex),
      title: `Book Title ${bookIndex}`,
      priceCents: 900 + ((bookIndex * 137) % 3500),
      publisherId: publishers[index % publishers.length].id,
    };
  });
}

function buildBookAuthors(books, authors) {
  const rows = [];
  for (let index = 0; index < books.length; index += 1) {
    const book = books[index];
    const authorCount = 1 + (index % 3);
    for (let offset = 0; offset < authorCount; offset += 1) {
      const author = authors[(index * 2 + offset) % authors.length];
      rows.push({ bookId: book.id, authorId: author.id });
    }
  }
  return rows;
}

function buildBookGenres(books, genres) {
  const rows = [];
  for (let index = 0; index < books.length; index += 1) {
    const book = books[index];
    const genreCount = 1 + (index % 2);
    for (let offset = 0; offset < genreCount; offset += 1) {
      const genre = genres[(index + offset * 3) % genres.length];
      rows.push({ bookId: book.id, genreId: genre.id });
    }
  }
  return rows;
}

function buildBookFormats(books) {
  const rows = [];
  for (let index = 0; index < books.length; index += 1) {
    const book = books[index];
    const formats = FORMAT_ROTATIONS[index % FORMAT_ROTATIONS.length];
    formats.forEach((format) => rows.push({ bookId: book.id, format }));
  }
  return rows;
}

function buildReviews(books, users) {
  const rows = [];
  for (let userIndex = 0; userIndex < users.length; userIndex += 1) {
    for (let offset = 0; offset < 6; offset += 1) {
      const book = books[(userIndex * 5 + offset * 7) % books.length];
      rows.push({
        id: `review_${users[userIndex].id}_${book.id}`,
        userId: users[userIndex].id,
        bookId: book.id,
        rating: ((userIndex + offset) % 5) + 1,
        text: `Review from ${users[userIndex].name} for ${book.title}`,
      });
    }
  }
  return rows;
}

function buildOrders(books, users, bookFormatMap) {
  const orders = [];
  const items = [];

  const orderUsers = users.slice(0, 90);
  orderUsers.forEach((user, userIndex) => {
    for (let orderOffset = 0; orderOffset < 2; orderOffset += 1) {
      const orderId = `order_${user.id}_${orderOffset + 1}`;
      orders.push({
        id: orderId,
        userId: user.id,
      });

      const itemCount = 1 + ((userIndex + orderOffset) % 3);
      for (let itemOffset = 0; itemOffset < itemCount; itemOffset += 1) {
        const book = books[(userIndex * 11 + orderOffset * 13 + itemOffset * 17) % books.length];
        const formats = bookFormatMap.get(book.id);
        const format = formats[(userIndex + itemOffset) % formats.length];

        items.push({
          orderId,
          bookId: book.id,
          format,
          quantity: 1 + ((userIndex + itemOffset) % 3),
          unitPriceCents: book.priceCents,
        });
      }
    }
  });

  return { orders, items };
}

async function resetDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookAuthor.deleteMany();
  await prisma.bookGenre.deleteMany();
  await prisma.bookFormat.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.publisher.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const publishers = buildPublishers();
  const authors = buildAuthors();
  const genres = buildGenres();
  const users = buildUsers();
  const books = buildBooks(publishers);

  const bookAuthors = buildBookAuthors(books, authors);
  const bookGenres = buildBookGenres(books, genres);
  const bookFormats = buildBookFormats(books);

  const bookFormatMap = new Map();
  bookFormats.forEach((row) => {
    if (!bookFormatMap.has(row.bookId)) {
      bookFormatMap.set(row.bookId, []);
    }
    bookFormatMap.get(row.bookId).push(row.format);
  });

  const reviews = buildReviews(books, users);
  const { orders, items } = buildOrders(books, users, bookFormatMap);

  await resetDatabase();

  await prisma.publisher.createMany({ data: publishers });
  await prisma.author.createMany({ data: authors });
  await prisma.genre.createMany({ data: genres });
  await prisma.user.createMany({ data: users });
  await prisma.book.createMany({ data: books });
  await prisma.bookAuthor.createMany({ data: bookAuthors });
  await prisma.bookGenre.createMany({ data: bookGenres });
  await prisma.bookFormat.createMany({ data: bookFormats });
  await prisma.review.createMany({ data: reviews });
  await prisma.order.createMany({ data: orders });
  await prisma.orderItem.createMany({ data: items });

  console.log('Seed complete:');
  console.log(`- publishers: ${publishers.length}`);
  console.log(`- authors: ${authors.length}`);
  console.log(`- genres: ${genres.length}`);
  console.log(`- users: ${users.length}`);
  console.log(`- books: ${books.length}`);
  console.log(`- bookAuthors: ${bookAuthors.length}`);
  console.log(`- bookGenres: ${bookGenres.length}`);
  console.log(`- bookFormats: ${bookFormats.length}`);
  console.log(`- reviews: ${reviews.length}`);
  console.log(`- orders: ${orders.length}`);
  console.log(`- orderItems: ${items.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
