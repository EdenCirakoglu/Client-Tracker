import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

describe('PostgreSQL identifier escaping', () => {
  it('quotes embedded delimiters as identifier data while keeping values parameterized', () => {
    const identifier = 'record"; SELECT 1; --';
    const query = new PgDialect().sqlToQuery(sql`select ${sql.identifier(identifier)}, ${'value'}`);
    expect(query.sql).toBe('select "record""; SELECT 1; --", $1');
    expect(query.params).toEqual(['value']);
  });
});
