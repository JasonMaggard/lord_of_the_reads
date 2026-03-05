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
  NumberInput,
  Pagination,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import { useDebouncedValue } from '@mantine/hooks';

const BOOKS_QUERY = gql`
  query Books($limit: Int, $offset: Int, $search: String) {
    books(limit: $limit, offset: $offset, search: $search) {
      id
      title
      priceCents
      reviewCount
      reviewMean
      authors {
        id
        name
      }
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

type Book = {
  id: string;
  title: string;
  priceCents: number;
  reviewCount: number;
  reviewMean: number;
  authors: Array<{ id: string; name: string }>;
};

type User = { id: string; name: string };
type CartItem = {
  bookId: string;
  title: string;
  format: string;
  quantity: number;
};

const PAGE_SIZE = 12;

function App() {
  const [bookSearchInput, setBookSearchInput] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [page, setPage] = useState(1);
  const [checkoutFormat, setCheckoutFormat] = useState('SOFTCOVER');
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
    },
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

  const books = booksData?.books ?? [];
  const users = usersData?.users ?? [];

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: `${user.name} (${user.id})` })),
    [users],
  );

  const canAddToCart = !!selectedBook && checkoutQty > 0 && !!checkoutFormat;
  const canCheckout = !!selectedUserId && cartItems.length > 0;

  return (
    <Box maw={1200} mx="auto" p="md">
      <Stack gap="md">
        <Title order={2}>Lord of the Reads</Title>

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

            {booksError && <Alert color="red">Failed to load books.</Alert>}

            {booksLoading ? (
              <Loader />
            ) : (
              <>
                <Carousel slideSize={{ base: '100%', sm: '50%', md: '33.333333%' }} slideGap="md">
                  {books.map((book) => (
                    <Carousel.Slide key={book.id}>
                      <Card
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
                          <Text size="sm">Rating: {book.reviewMean.toFixed(1)} ({book.reviewCount})</Text>
                          <Button size="xs" variant="light" onClick={() => setSelectedBook(book)}>
                            Select
                          </Button>
                        </Stack>
                      </Card>
                    </Carousel.Slide>
                  ))}
                </Carousel>
                <Group justify="center">
                  <Pagination value={page} onChange={setPage} total={20} />
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
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}

export default App;
