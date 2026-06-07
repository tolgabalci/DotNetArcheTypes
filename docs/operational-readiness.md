# Operational Readiness Checklist

## Before Production

- [ ] Replace placeholder GitHub owner/repo context values.
- [ ] Configure staging and production GitHub Environments.
- [ ] Confirm Cognito callback/logout URLs.
- [ ] Review Mermaid loose-rendering exception.
- [ ] Configure custom domains and TLS certificates.
- [ ] Add WAF rules for CloudFront and the ALB.
- [ ] Add CloudWatch alarms for API 5xx, latency, ECS task restarts, RDS CPU, and RDS storage.
- [ ] Enable RDS deletion protection in production.
- [ ] Confirm backup and restore process.
- [ ] Run Playwright smoke tests against staging.
- [ ] Review GitHub deploy role permissions with platform/security.

## Acceptance Criteria

- Users can sign in through Cognito.
- Users can create, edit, search, and delete only their own entries.
- Edited entries return to the top of the feed.
- Mermaid charts render in feed and editor preview.
- Search matches description and Mermaid source.
- Staging deploy completes from GitHub Actions.
- Production deploy requires approval.
