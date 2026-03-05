import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMutation, useQuery } from '@apollo/client/react';
import { MantineProvider } from '@mantine/core';
import App from './App';

vi.mock('@apollo/client/core', () => ({
  gql: (literals: TemplateStringsArray, ...placeholders: unknown[]) =>
    literals.reduce((value, literal, index) => `${value}${literal}${placeholders[index] ?? ''}`, ''),
}));

vi.mock('@mantine/carousel', () => {
  function CarouselComponent({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }

  function Slide({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
  }

  return {
    Carousel: Object.assign(CarouselComponent, { Slide }),
  };
});

vi.mock('@apollo/client/react', async () => {
  return {
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
    mockedUseMutation.mockReset();

    mockedUseQuery.mockImplementation((query: unknown) => {
      if (String(query).includes('query Books')) {
        return {
          data: {
            books: [
              {
                id: 'book_0001',
                title: 'Book 1',
                priceCents: 1234,
                reviewCount: 3,
                reviewMean: 4.2,
                authors: [{ id: 'author_1', name: 'Author 1' }],
                genres: [{ id: 'genre_1', name: 'Fiction' }],
              },
            ],
          },
          loading: false,
          error: undefined,
          refetch: vi.fn(),
        } as never;
      }

      return {
        data: {
          users: [{ id: 'user_0001', name: 'Reader 1' }],
        },
        loading: false,
        error: undefined,
      } as never;
    });

    mockedUseMutation.mockReturnValue([
      vi.fn(),
      {
        data: undefined,
        loading: false,
        error: undefined,
      },
    ] as never);
  });

  it('renders bookshelf content from query data', () => {
    renderApp();

    expect(screen.getByText('Lord of the Reads')).toBeInTheDocument();
    expect(screen.getByText('Book 1')).toBeInTheDocument();
    expect(screen.getByText('Author 1')).toBeInTheDocument();
  });

  it('shows checkout disabled until required selections are present', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  });

  it('renders checkout success feedback when mutation returns an order', () => {
    mockedUseMutation.mockReset();
    mockedUseMutation.mockReturnValue([
      vi.fn(),
      {
        data: {
          checkout: {
            id: 'order_0001',
          },
        },
        loading: false,
        error: undefined,
      },
    ] as never);

    renderApp();

    expect(screen.getByText('Order created: order_0001')).toBeInTheDocument();
  });
});
