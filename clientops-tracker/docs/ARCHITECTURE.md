# Architecture

ClientOps Tracker is a pnpm monorepo with a browser application, an HTTP API, and a relational database. Each runtime has a clear responsibility while root scripts and quality tooling keep local development consistent.

## Components

```mermaid
flowchart TB
    Web[apps/web - Next.js App Router] -->|HTTP JSON and Bearer JWT| API[apps/api - Express REST API]
    API --> Middleware[Helmet, CORS, validation, auth, RBAC]
    Middleware --> Controllers[Controllers]
    Controllers --> Services[Domain services]
    Services --> Drizzle[Drizzle ORM]
    Drizzle --> Postgres[(PostgreSQL)]
    Services --> Triage[Rule-based triage boundary]
    Triage --> Postgres
```

### Web application

`apps/web` provides the authenticated dashboard, login page, role-aware navigation, ticket workflows, comments, releases, and triage controls. Its API client reads `NEXT_PUBLIC_API_URL`, attaches the stored bearer token, and converts API errors into typed frontend errors.

### API application

`apps/api` owns authentication, authorization, validation, request handling, domain services, OpenAPI documentation, and database access. Routes are thin and delegate business behavior to controllers and services.

### Database

PostgreSQL is the source of truth for users, client ownership, projects, tickets, comments, ticket events, releases, and triage suggestions. Drizzle ORM provides typed queries and Drizzle Kit manages migrations.

## Request Flow

1. The browser calls the Express API with JSON and, for protected routes, a bearer JWT.
2. Express applies security headers, CORS, JSON parsing, authentication, and role checks.
3. Zod validates request bodies and route parameters.
4. Controllers call services for authorization-aware database operations.
5. Drizzle executes parameterized PostgreSQL queries.
6. The API returns `{ "data": ... }` on success or a structured `error` object.

## Authentication Flow

Login looks up a user by email, verifies the bcryptjs password hash, and signs a JWT containing the user identity and role. Protected requests verify the token and reload the current user from the database before authorization is applied. Password hashes are never returned to the client.

The current web MVP stores the token in localStorage. This is documented as a limitation; a production hosted version should use secure, HTTP-only cookies with HTTPS.

## RBAC and Ownership

- `ADMIN` can manage all operational resources.
- `DEVELOPER` can view operational data, update tickets, create comments, and generate or apply triage suggestions.
- `CLIENT` can access only their own client, projects, tickets, releases, and public comments. Ticket creation is limited to their own projects.

Role checks and ownership filters are enforced in the API. Frontend navigation mirrors those rules for usability but is not treated as a security boundary.

## Triage Boundary

The triage service evaluates text with deterministic rules and persists a suggestion.
The pure `evaluateTicketTriage` function is the provider boundary; no network LLM
call is made. Its score is a heuristic rule-match score, not a probability.
Internal ticket detail loads the saved suggestion and history from PostgreSQL.
Generation and application lock the ticket row; application commits category,
priority, acceptance and one history event in the same transaction. Reapplying an
accepted suggestion is a no-op, including after later manual ticket edits.

Client responses omit operational workload, triage and internal history at the
service layer. Public comments and ownership-filtered project/ticket/release data
remain available. Display-name projections never return password hashes.

## Delivery

The actual Git root contains `.github/workflows/`, while the pnpm workspace is
nested under `clientops-tracker/`. CI is configured to run checks against a separate
disposable PostgreSQL cluster. Image publication requires passing CI for the same
commit. Production Compose uses same-origin Nginx routing and container-executed
migrations. Manual deployment is gated by an operator-configured production
environment. Hosted CI and deployment are pending until actual runs succeed.
