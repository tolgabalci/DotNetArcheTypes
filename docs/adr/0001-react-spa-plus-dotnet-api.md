# ADR 0001: React SPA Plus ASP.NET Core API

## Status

Accepted.

## Decision

Use a Vite React/TypeScript SPA backed by an ASP.NET Core .NET 10 Minimal API.

## Rationale

This mirrors common enterprise web architecture: the frontend is independently built and CDN-hosted, while the backend owns authentication validation, persistence, authorization, and operational telemetry. It also allows Mermaid/Monaco-heavy UI work to remain in the browser where those ecosystems are strongest.

## Consequences

- The API contract matters and must be tested.
- Browser auth uses bearer tokens instead of server cookies.
- Deployment requires both web asset hosting and API hosting.
