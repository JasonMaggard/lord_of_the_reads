import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'lord-of-the-reads-api',
      }),
    );
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('GraphQL books/users query smoke', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ books(limit: 1) { id title } users(limit: 1) { id name } }',
      })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(Array.isArray(response.body.data.books)).toBe(true);
    expect(Array.isArray(response.body.data.users)).toBe(true);
  });

  it('GraphQL error format smoke', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ definitelyNotAField }' })
      .expect(400);

    expect(response.body.errors[0]).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        extensions: expect.objectContaining({
          code: expect.any(String),
        }),
      }),
    );
  });
});
