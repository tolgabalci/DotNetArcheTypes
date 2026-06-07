# ADR 0003: Modular Monolith with PostgreSQL Schemas

## Status

Accepted.

## Decision

Implement the backend as a modular monolith and use PostgreSQL schemas to reinforce module ownership. The first module is `Entries`, backed by the `entries` schema.

## Rationale

This provides a principal-engineer-friendly growth path without over-distributing a small application. Each module can own endpoints, contracts, data mappings, migrations, and tests. PostgreSQL keeps search, ownership filters, and migrations straightforward.

## Consequences

- Cross-module access should go through module contracts, not direct table access.
- Future modules should avoid sharing mutable tables.
- Strong boundaries are a code review discipline until additional enforcement is introduced.
