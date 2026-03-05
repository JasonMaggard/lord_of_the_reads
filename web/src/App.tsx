import { useMemo, useState } from 'react';
import { gql } from '@apollo/client/core';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  Rating,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

const BOOKS_QUERY = gql`
  query Books($limit: Int, $offset: Int, $search: String, $genreId: String) {
    books(limit: $limit, offset: $offset, search: $search, genreId: $genreId) {
      id
      title
      priceCents
      reviewCount
      reviewMean
      authors {
        id
        name
      }
      genres {
        id
        name
      }
    }
  }
`;

const BOOKS_COUNT_QUERY = gql`
  query BooksCount($search: String, $genreId: String) {
    booksCount(search: $search, genreId: $genreId)
  }
`;

const GENRES_QUERY = gql`
  query Genres {
    genres {
      id
      name
    }
  }
`;

const USERS_QUERY = gql`
  query Users($search: String, $limit: Int, $offset: Int) {
    users(search: $search, limit: $limit, offset: $offset) {
      id
      name
    }
  }
`;

const CHECKOUT_MUTATION = gql`
  mutation Checkout($userId: String!, $items: [CheckoutItemInput!]!) {
    checkout(userId: $userId, items: $items) {
      id
      items {
        bookId
        format
        quantity
        unitPriceCents
      }
    }
  }
`;

const CREATE_REVIEW_MUTATION = gql`
  mutation CreateReview($userId: String!, $bookId: String!, $rating: Int!, $text: String!) {
    createReview(userId: $userId, bookId: $bookId, rating: $rating, text: $text) {
      id
      rating
      text
    }
  }
`;

type Book = {
  id: string;
  title: string;
  priceCents: number;
  reviewCount: number;
  reviewMean: number;
  authors: Array<{ id: string; name: string }>;
  genres: Array<{ id: string; name: string }>;
};

type User = { id: string; name: string };
type Genre = { id: string; name: string };
type CartItem = {
  bookId: string;
  title: string;
  format: string;
  quantity: number;
};

const PAGE_SIZE = 24;

function App() {
  const [bookSearchInput, setBookSearchInput] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [page, setPage] = useState(1);
  const [checkoutFormat, setCheckoutFormat] = useState('SOFTCOVER');
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const [bookSearch] = useDebouncedValue(bookSearchInput, 250);
  const [userSearch] = useDebouncedValue(userSearchInput, 250);

  const {
    data: booksData,
    loading: booksLoading,
    error: booksError,
    refetch: refetchBooks,
  } = useQuery<{ books: Book[] }>(BOOKS_QUERY, {
    variables: {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      search: bookSearch.trim() || undefined,
      genreId: selectedGenreId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: booksCountData } = useQuery<{ booksCount: number }>(BOOKS_COUNT_QUERY, {
    variables: {
      search: bookSearch.trim() || undefined,
      genreId: selectedGenreId || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: genresData } = useQuery<{ genres: Genre[] }>(GENRES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: usersData, loading: usersLoading } = useQuery<{ users: User[] }>(USERS_QUERY, {
    variables: {
      search: userSearch.trim() || undefined,
      limit: 30,
      offset: 0,
    },
    fetchPolicy: 'cache-and-network',
  });

  const [checkout, { data: checkoutData, loading: checkoutLoading, error: checkoutError }] =
    useMutation<{ checkout: { id: string } }>(CHECKOUT_MUTATION);

  const [createReview, { data: reviewData, loading: reviewLoading, error: reviewError }] =
    useMutation<{ createReview: { id: string } }>(CREATE_REVIEW_MUTATION);

  const books = booksData?.books ?? [];
  const users = usersData?.users ?? [];
  const genres = genresData?.genres ?? [];
  const booksCount = booksCountData?.booksCount ?? 0;

  const totalPages = Math.max(1, Math.ceil(booksCount / PAGE_SIZE));

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: `${user.name} (${user.id})` })),
    [users],
  );

  const genreOptions = useMemo(
    () => genres.map((genre) => ({ value: genre.id, label: genre.name })),
    [genres],
  );

  const canAddToCart = !!selectedBook && checkoutQty > 0 && !!checkoutFormat;
  const canCheckout = !!selectedUserId && cartItems.length > 0;
  const canReview = !!selectedUserId && !!selectedBook;

  return (
    <Box maw={1200} mx="auto" p="md">
      <Stack gap="md">
        <Title order={2}>Lord of the Reads</Title>

        <Modal
          opened={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Create review"
          centered
        >
          <Stack>
            <Rating value={reviewRating} onChange={setReviewRating} count={5} />
            <Textarea
              label="Review text"
              placeholder="Share your thoughts about this book"
              value={reviewText}
              minRows={4}
              onChange={(event) => setReviewText(event.currentTarget.value)}
            />
            {reviewError && <Alert color="red">{reviewError.message}</Alert>}
            <Group justify="flex-end">
              <Button
                loading={reviewLoading}
                disabled={!canReview || reviewRating < 1 || reviewRating > 5 || !reviewText.trim()}
                onClick={async () => {
                  if (!selectedBook || !selectedUserId) {
                    return;
                  }

                  await createReview({
                    variables: {
                      userId: selectedUserId,
                      bookId: selectedBook.id,
                      rating: reviewRating,
                      text: reviewText,
                    },
                  });

                  setReviewModalOpen(false);
                  setReviewText('');
                  setReviewRating(5);
                  await refetchBooks();
                }}
              >
                Submit review
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Card withBorder>
          <Stack>
            <Title order={4}>Current User</Title>
            <TextInput
              label="Search users"
              value={userSearchInput}
              onChange={(event) => setUserSearchInput(event.currentTarget.value)}
              placeholder="Reader 1"
            />
            <Select
              label="Select current user"
              placeholder="Choose a user"
              searchable
              nothingFoundMessage={usersLoading ? 'Loading...' : 'No users found'}
              data={userOptions}
              value={selectedUserId}
              onChange={setSelectedUserId}
            />
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group justify="space-between">
              <Title order={4}>Bookshelf</Title>
              <Group>
                <Select
                  placeholder="Filter by genre"
                  data={genreOptions}
                  clearable
                  value={selectedGenreId}
                  onChange={(value) => {
                    setSelectedGenreId(value);
                    setPage(1);
                  }}
                  w={240}
                />
                <TextInput
                  placeholder="Search title or author"
                  value={bookSearchInput}
                  onChange={(event) => {
                    setBookSearchInput(event.currentTarget.value);
                    setPage(1);
                  }}
                  w={320}
                />
              </Group>
            </Group>

            {booksError && <Alert color="red">Failed to load books.</Alert>}

            {booksLoading ? (
              <Loader />
            ) : (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                  {books.map((book) => (
                    <Card
                      key={book.id}
                      withBorder
                      h="100%"
                      style={{
                        borderColor:
                          selectedBook?.id === book.id ? 'var(--mantine-color-blue-4)' : undefined,
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text fw={600}>{book.title}</Text>
                          <Badge>${(book.priceCents / 100).toFixed(2)}</Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {book.authors.map((author) => author.name).join(', ')}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Genres: {book.genres.map((genre) => genre.name).join(', ')}
                        </Text>
                        <Text size="sm">Rating: {book.reviewMean.toFixed(1)} ({book.reviewCount})</Text>
                        <Button size="xs" variant="light" onClick={() => setSelectedBook(book)}>
                          Select
                        </Button>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
                <Group justify="center">
                  <Pagination value={Math.min(page, totalPages)} onChange={setPage} total={totalPages} />
                </Group>
              </>
            )}
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Title order={4}>Checkout</Title>

            {selectedBook ? (
              <Stack gap="xs">
                <Text fw={600}>{selectedBook.title}</Text>
                <Text size="sm" c="dimmed">
                  {selectedBook.authors.map((author) => author.name).join(', ')}
                </Text>
              </Stack>
            ) : (
              <Text c="dimmed">Select a book from the bookshelf.</Text>
            )}

            <Group grow>
              <Select
                label="Format"
                data={['HARDCOVER', 'SOFTCOVER', 'AUDIOBOOK', 'EREADER']}
                value={checkoutFormat}
                onChange={(value) => setCheckoutFormat(value ?? 'SOFTCOVER')}
              />
              <NumberInput
                label="Quantity"
                min={1}
                value={checkoutQty}
                onChange={(value) => setCheckoutQty(Number(value) || 1)}
              />
            </Group>

            <Group>
              <Button
                variant="default"
                disabled={!canReview}
                onClick={() => setReviewModalOpen(true)}
              >
                Review
              </Button>

              <Button
                variant="light"
                disabled={!canAddToCart}
                onClick={() => {
                  if (!selectedBook) {
                    return;
                  }

                  const cartKey = `${selectedBook.id}:${checkoutFormat}`;

                  setCartItems((currentItems) => {
                    const existingIndex = currentItems.findIndex(
                      (item) => `${item.bookId}:${item.format}` === cartKey,
                    );

                    if (existingIndex === -1) {
                      return [
                        ...currentItems,
                        {
                          bookId: selectedBook.id,
                          title: selectedBook.title,
                          format: checkoutFormat,
                          quantity: checkoutQty,
                        },
                      ];
                    }

                    return currentItems.map((item, index) =>
                      index === existingIndex
                        ? {
                            ...item,
                            quantity: item.quantity + checkoutQty,
                          }
                        : item,
                    );
                  });
                }}
              >
                Add to cart
              </Button>

              <Button
                disabled={!canCheckout}
                loading={checkoutLoading}
                onClick={async () => {
                  if (!selectedUserId || cartItems.length === 0) {
                    return;
                  }

                  await checkout({
                    variables: {
                      userId: selectedUserId,
                      items: cartItems.map((item) => ({
                        bookId: item.bookId,
                        format: item.format,
                        quantity: item.quantity,
                      })),
                    },
                  });

                  setCartItems([]);
                  await refetchBooks();
                }}
              >
                Checkout
              </Button>
            </Group>

            <Stack gap="xs">
              <Text fw={600}>Cart ({cartItems.length})</Text>
              {cartItems.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No books in cart.
                </Text>
              ) : (
                cartItems.map((item) => (
                  <Group key={`${item.bookId}:${item.format}`} justify="space-between" align="center">
                    <Text size="sm">
                      {item.title} · {item.format} · Qty {item.quantity}
                    </Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        setCartItems((currentItems) =>
                          currentItems.filter(
                            (cartItem) =>
                              !(
                                cartItem.bookId === item.bookId &&
                                cartItem.format === item.format
                              ),
                          ),
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </Group>
                ))
              )}
            </Stack>

            {checkoutError && <Alert color="red">{checkoutError.message}</Alert>}
            {checkoutData?.checkout?.id && (
              <Alert color="green">Order created: {checkoutData.checkout.id}</Alert>
            )}
            {reviewData?.createReview?.id && <Alert color="green">Review created.</Alert>}
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}

export default App;
