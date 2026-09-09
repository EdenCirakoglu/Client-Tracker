# Changelog

All notable changes to ClientOps Tracker are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows semantic versioning where releases are tagged.

## [0.1.0] - 2026-09-04

### Added

- pnpm monorepo with Next.js web and Express API applications.
- PostgreSQL schema, Drizzle ORM migrations, and local seed data.
- JWT authentication, bcryptjs password verification, RBAC, and Zod validation.
- REST API resources for clients, projects, tickets, comments, releases, and dashboard metrics.
- Swagger/OpenAPI documentation.
- Deterministic rule-based ticket triage with suggestion application events.
- Responsive Next.js dashboard consuming the real API.
- Vitest and Supertest API coverage.
- Docker Compose, Dockerfiles, GitHub Actions CI, and GHCR image publishing foundations.
