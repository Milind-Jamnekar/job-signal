import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HealthCheckResult } from '@nestjs/terminus';
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
    // Close Nest so TypeORM/Redis/BullMQ connections are released and Jest
    // exits cleanly instead of hanging on open handles.
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health/live (GET) is up with no external deps', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthCheckResult;
        expect(body.status).toBe('ok');
      });
  });

  it('/health/ready (GET) reports database and redis up', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthCheckResult;
        expect(body.status).toBe('ok');
        expect(body.info?.database?.status).toBe('up');
        expect(body.info?.redis?.status).toBe('up');
      });
  });
});
