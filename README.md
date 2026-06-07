# Mermaid Notes .NET 10 Reference App

Mermaid Notes is a reference application for private diagram notes. Signed-in users create Markdown summaries with Mermaid chart definitions, browse a reverse-chronological feed, search descriptions and Mermaid source, and edit diagrams in a split Monaco/Mermaid live preview experience.

The repo demonstrates a modern .NET-on-AWS architecture:

- ASP.NET Core .NET 10 Minimal API modular monolith.
- React 19 + TypeScript + Vite SPA.
- Amazon Cognito OIDC with Authorization Code + PKCE.
- EF Core 10 with PostgreSQL, full-text search, and trigram indexes.
- .NET Aspire AppHost for local orchestration.
- AWS CDK in TypeScript for ECS Fargate, RDS, S3/CloudFront, Cognito, CloudWatch, and GitHub OIDC.
- GitHub Actions CI/CD with staging deployment and production approval gate.

## At A Glance

| Area | What It Shows | Primary Technology |
| --- | --- | --- |
| User experience | Reverse-chronological note feed, search, split Mermaid editor, live chart preview | React, Fluent UI, TanStack Query, Monaco Editor, Mermaid.js |
| API | Versioned entry endpoints with user-scoped ownership rules | ASP.NET Core .NET 10 Minimal APIs |
| Data | Markdown description, Mermaid source, timestamps, cursor paging, full-text search | EF Core 10, PostgreSQL, pg_trgm |
| Identity | Browser sign-in and API token validation | Amazon Cognito OIDC, Authorization Code + PKCE, JWT bearer auth |
| Local platform | One-command local orchestration with database and telemetry surface | .NET Aspire AppHost |
| Cloud platform | Production-shaped AWS deployment | ECS Fargate, RDS PostgreSQL, S3, CloudFront, ALB, CloudWatch |
| Delivery | Build, test, deploy, and production approval workflow | GitHub Actions, GitHub OIDC, AWS CDK |

## System Flow

```mermaid
flowchart LR
  User["Signed-in user"] --> Web["React SPA<br/>feed, search, editor"]
  Web --> Cognito["Amazon Cognito<br/>OIDC + PKCE"]
  Web --> Api["ASP.NET Core .NET 10 API<br/>Minimal API modular monolith"]
  Api --> Authz["Per-user authorization<br/>Cognito subject claim"]
  Api --> Db[("PostgreSQL<br/>entries schema")]
  Api --> Telemetry["OpenTelemetry<br/>CloudWatch-ready signals"]
  Web --> Renderer["Mermaid.js renderer<br/>loose mode + DOMPurify"]
```

## User Workflow

```mermaid
sequenceDiagram
  actor User
  participant Web as React SPA
  participant API as ASP.NET Core API
  participant DB as PostgreSQL

  User->>Web: Open private feed
  Web->>API: GET /api/v1/entries
  API->>DB: Query user's entries by modified time descending
  DB-->>API: Cursor page of entries
  API-->>Web: Entry cards with rendered chart data
  User->>Web: Click chart
  Web->>Web: Open split Monaco editor and live preview
  User->>Web: Edit Mermaid source
  Web->>Web: Parse, diagnose, fix, sanitize, and render
  User->>Web: Save
  Web->>API: PUT /api/v1/entries/{id}
  API->>DB: Update description, source, and modified timestamp
  API-->>Web: Updated entry
  Web->>Web: Return to feed with edited entry at top
```

## Module Map

```mermaid
flowchart TB
  subgraph Web["src/web"]
    Feed["FeedPage<br/>infinite scroll + search"]
    Editor["EditorPage<br/>Monaco + live preview"]
    MermaidTools["Mermaid editor tools<br/>syntax, snippets, diagnostics, quick fixes"]
    Renderer["ChartRenderer<br/>Mermaid + DOMPurify"]
  end

  subgraph Api["src/api"]
    Endpoints["Entries endpoints<br/>create, list, get, update, delete, search"]
    Search["Search service<br/>full-text + trigram ranking"]
    Data["EntriesDbContext<br/>EF Core 10 mappings"]
    Auth["JWT bearer auth<br/>current user subject"]
  end

  subgraph Platform["platform"]
    Aspire[".NET Aspire AppHost<br/>local orchestration"]
    Cdk["AWS CDK<br/>cloud infrastructure"]
    Actions["GitHub Actions<br/>CI/CD gates"]
    Cloud["AWS runtime<br/>Cognito, ECS, RDS, S3, CloudFront"]
  end

  Feed --> Endpoints
  Editor --> Endpoints
  Editor --> MermaidTools
  MermaidTools --> Renderer
  Endpoints --> Auth
  Endpoints --> Data
  Search --> Data
  Aspire -.-> Web
  Aspire -.-> Api
  Cdk -.-> Cloud
  Actions -.-> Cdk
```

## Repository Layout

```text
src/api       ASP.NET Core .NET 10 API
src/web       React/TypeScript SPA
src/apphost   .NET Aspire local orchestration
tests/api     API unit and integration tests
infra/cdk     AWS CDK TypeScript app
docs          Architecture, ADRs, threat model, runbooks
```

## Prerequisites

Install these tools before running the full local or cloud workflow:

- .NET SDK 10.0.x
- Node.js 26.x
- Docker Desktop or OrbStack
- AWS CLI v2
- AWS CDK bootstrapped for the target account and region
- PostgreSQL only if you are not using Aspire/Docker

## Local Development

Run the local orchestrated environment after installing .NET 10 and Docker:

```bash
dotnet restore MermaidNotes.slnx
dotnet run --project src/apphost/MermaidNotes.AppHost.csproj
```

The AppHost starts PostgreSQL, the API, and the Vite app. By default, local development uses mock browser auth and API test auth to keep the feedback loop fast. To use real Cognito locally, provision the dev stack and set AppHost user secrets:

```bash
dotnet user-secrets set --project src/apphost Authentication:Mode Cognito
dotnet user-secrets set --project src/apphost Web:AuthMode oidc
```

Then configure `src/web/.env` from `src/web/.env.example`.

## Backend Commands

```bash
dotnet restore MermaidNotes.slnx
dotnet build MermaidNotes.slnx
dotnet test tests/api/MermaidNotes.Api.Tests.csproj
dotnet ef database update --project src/api
```

## Frontend Commands

```bash
cd src/web
npm ci
npm run dev
npm test
npm run build
```

## Infrastructure Commands

```bash
cd infra/cdk
npm ci
npm run build
npm test
npx cdk bootstrap
npx cdk deploy MermaidNotes-staging \
  --context stage=staging \
  --context githubOwner=<github-owner> \
  --context githubRepo=<repo-name>
```

After first deployment, copy CDK outputs into the `staging` and `production` GitHub Environment variables referenced by `.github/workflows/deploy.yml`.

## Deployment Shape

```mermaid
flowchart TD
  GitHub["GitHub Actions<br/>build, test, deploy"] --> OIDC["GitHub OIDC<br/>short-lived AWS credentials"]
  OIDC --> CDK["AWS CDK TypeScript app"]
  CDK --> Cognito["Cognito user pool<br/>hosted UI + app client"]
  CDK --> CloudFront["CloudFront distribution"]
  CloudFront --> S3["S3 SPA bucket"]
  CDK --> ALB["Application Load Balancer"]
  ALB --> ECS["ECS Fargate service<br/>ASP.NET Core API container"]
  ECS --> RDS[("RDS PostgreSQL<br/>private subnets")]
  ECS --> Logs["CloudWatch<br/>logs, metrics, alarms"]
```

The deployment workflow defaults to staging on `main`. Production deployment is intentionally gated through a GitHub Environment approval and should only run after the AWS account, domain, secret rotation, and observability settings have been reviewed.

## Security Note

Mermaid is configured with `securityLevel: "loose"` because this project intentionally allows richer diagram features. The renderer still sanitizes SVG output with DOMPurify and the HTML document includes a restrictive CSP, but loose Mermaid rendering should be treated as a reviewed exception in a corporate environment. See [ADR 0004](docs/adr/0004-mermaid-loose-rendering.md) and [Threat Model](docs/threat-model.md).
