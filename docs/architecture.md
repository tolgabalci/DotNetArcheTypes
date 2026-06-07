# Architecture

Mermaid Notes uses a split frontend/API architecture while keeping backend deployment as a modular monolith. This is a practical corporate baseline: frontend teams can work independently, backend features remain cohesive, and the first deployment avoids premature distributed-service complexity.

## Runtime Flow

1. The React SPA is served from S3 through CloudFront.
2. Users authenticate through Amazon Cognito Hosted UI using Authorization Code + PKCE.
3. The SPA calls the ASP.NET Core API with Cognito JWT bearer tokens.
4. The API validates tokens, scopes every query by Cognito `sub`, and persists entries in PostgreSQL.
5. Search uses PostgreSQL full-text and trigram indexes across Markdown descriptions and Mermaid source.
6. Browser-side Mermaid rendering shows diagrams in feed cards and editor previews.

## Backend Modularity

The API is organized by module instead of by technical layer. The first module is `Entries`, which owns:

- HTTP endpoint mapping.
- Request/response contracts.
- Entity model and validation.
- Current-user scoping.
- Search behavior.

Future modules should get their own namespace, schema, endpoints, and tests.

## Diagrams

- [System context](diagrams/system-context.mmd)
- [AWS deployment](diagrams/aws-deployment.mmd)
