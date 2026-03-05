import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { LoggerModule } from 'nestjs-pino';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { OrdersModule } from './orders/orders.module';

function statusToCode(statusCode?: number): string {
  if (statusCode === 400) return 'BAD_USER_INPUT';
  if (statusCode === 401) return 'UNAUTHENTICATED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  return 'INTERNAL_SERVER_ERROR';
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
        customProps: (req) => ({
          correlationId: req.headers['x-correlation-id'] ?? null,
        }),
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      formatError: (formattedError: GraphQLFormattedError, error: unknown) => {
        const graphQLError = error as GraphQLError;
        const extensions = graphQLError?.extensions ?? formattedError.extensions ?? {};
        const originalError = (graphQLError?.originalError as { message?: string; status?: number; statusCode?: number } | undefined) ?? {};
        const statusCode =
          typeof extensions.statusCode === 'number'
            ? extensions.statusCode
            : typeof extensions.status === 'number'
              ? extensions.status
              : typeof originalError.statusCode === 'number'
                ? originalError.statusCode
                : typeof originalError.status === 'number'
                  ? originalError.status
                  : undefined;
        const code =
          typeof extensions.code === 'string' && extensions.code !== 'INTERNAL_SERVER_ERROR'
            ? extensions.code
            : statusToCode(statusCode);
        const message = formattedError.message || originalError.message || 'Internal server error';

        return {
          message,
          extensions: {
            code,
            ...(statusCode !== undefined ? { statusCode } : {}),
          },
        };
      },
    }),
    PrismaModule,
    BooksModule,
    UsersModule,
    ReviewsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
