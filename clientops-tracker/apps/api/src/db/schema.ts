import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'DEVELOPER', 'CLIENT']);

export const projectStatusEnum = pgEnum('project_status', ['ACTIVE', 'PAUSED', 'COMPLETED']);

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'BUG',
  'FEATURE_REQUEST',
  'SUPPORT',
  'SECURITY',
  'PERFORMANCE',
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ticketStatusEnum = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CLIENT',
  'RESOLVED',
  'CLOSED',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    ...timestamps,
  },
  (table) => ({
    nameIdx: index('clients_name_idx').on(table.name),
    contactEmailIdx: index('clients_contact_email_idx').on(table.contactEmail),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => ({
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    roleIdx: index('users_role_idx').on(table.role),
    clientIdIdx: index('users_client_id_idx').on(table.clientId),
  }),
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    status: projectStatusEnum('status').notNull().default('ACTIVE'),
    ...timestamps,
  },
  (table) => ({
    clientIdIdx: index('projects_client_id_idx').on(table.clientId),
    statusIdx: index('projects_status_idx').on(table.status),
  }),
);

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    assignedToId: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 220 }).notNull(),
    description: text('description').notNull(),
    category: ticketCategoryEnum('category').notNull(),
    priority: ticketPriorityEnum('priority').notNull().default('MEDIUM'),
    status: ticketStatusEnum('status').notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    projectIdIdx: index('tickets_project_id_idx').on(table.projectId),
    createdByIdIdx: index('tickets_created_by_id_idx').on(table.createdById),
    assignedToIdIdx: index('tickets_assigned_to_id_idx').on(table.assignedToId),
    statusIdx: index('tickets_status_idx').on(table.status),
    priorityIdx: index('tickets_priority_idx').on(table.priority),
    categoryIdx: index('tickets_category_idx').on(table.category),
  }),
);

export const ticketComments = pgTable(
  'ticket_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    isInternal: boolean('is_internal').notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    ticketIdIdx: index('ticket_comments_ticket_id_idx').on(table.ticketId),
    authorIdIdx: index('ticket_comments_author_id_idx').on(table.authorId),
  }),
);

export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdIdx: index('ticket_events_ticket_id_idx').on(table.ticketId),
    actorIdIdx: index('ticket_events_actor_id_idx').on(table.actorId),
    eventTypeIdx: index('ticket_events_event_type_idx').on(table.eventType),
  }),
);

export const releases = pgTable(
  'releases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    notes: text('notes'),
    releaseDate: timestamp('release_date', { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    projectIdIdx: index('releases_project_id_idx').on(table.projectId),
    projectVersionUnique: uniqueIndex('releases_project_version_unique').on(
      table.projectId,
      table.version,
    ),
  }),
);

export const triageSuggestions = pgTable(
  'triage_suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    suggestedCategory: ticketCategoryEnum('suggested_category').notNull(),
    suggestedPriority: ticketPriorityEnum('suggested_priority').notNull(),
    summary: text('summary').notNull(),
    suggestedNextAction: text('suggested_next_action').notNull(),
    confidenceScore: integer('confidence_score').notNull(),
    accepted: boolean('accepted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ticketIdIdx: index('triage_suggestions_ticket_id_idx').on(table.ticketId),
    confidenceScoreCheck: check(
      'triage_suggestions_confidence_score_check',
      sql`${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 100`,
    ),
  }),
);

export const clientsRelations = relations(clients, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  client: one(clients, {
    fields: [users.clientId],
    references: [clients.id],
  }),
  createdTickets: many(tickets, { relationName: 'ticket_creator' }),
  assignedTickets: many(tickets, { relationName: 'ticket_assignee' }),
  comments: many(ticketComments),
  events: many(ticketEvents),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tickets: many(tickets),
  releases: many(releases),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [tickets.createdById],
    references: [users.id],
    relationName: 'ticket_creator',
  }),
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
    relationName: 'ticket_assignee',
  }),
  comments: many(ticketComments),
  events: many(ticketEvents),
  triageSuggestions: many(triageSuggestions),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id],
  }),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
  actor: one(users, {
    fields: [ticketEvents.actorId],
    references: [users.id],
  }),
}));

export const releasesRelations = relations(releases, ({ one }) => ({
  project: one(projects, {
    fields: [releases.projectId],
    references: [projects.id],
  }),
}));

export const triageSuggestionsRelations = relations(triageSuggestions, ({ one }) => ({
  ticket: one(tickets, {
    fields: [triageSuggestions.ticketId],
    references: [tickets.id],
  }),
}));
