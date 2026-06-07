# ADR 0005: AWS ECS Fargate with TypeScript CDK

## Status

Accepted.

## Decision

Deploy the API as an ECS Fargate service behind an Application Load Balancer. Deploy the SPA to S3 and CloudFront. Provision infrastructure with AWS CDK in TypeScript.

## Rationale

ECS Fargate is a pragmatic enterprise container target for ASP.NET Core. S3/CloudFront is the natural hosting model for a static SPA. TypeScript CDK is broadly used in AWS organizations and complements the React frontend while keeping infrastructure strongly typed.

## Consequences

- CI/CD needs Docker for API image assets.
- Initial bootstrap requires AWS CDK bootstrapping and GitHub OIDC role configuration.
- Production hardening should add WAF, custom domains, alarms, and tighter deploy IAM policies.
