# Threat Model

## Assets

- Private user entries and Mermaid source.
- Cognito identity tokens.
- PostgreSQL data.
- AWS deployment role and CDK-managed resources.

## Primary Risks

- XSS through Mermaid loose rendering or Markdown descriptions.
- Broken object-level authorization exposing another user's entries.
- Token theft from browser storage.
- Overprivileged GitHub deployment role.
- Destructive infrastructure changes in production.

## Controls in This Repo

- API validates JWTs and scopes every entry query by user subject.
- Markdown and rendered SVG are sanitized before insertion into the DOM.
- CSP restricts script, connect, frame, and font sources.
- GitHub Actions uses OIDC instead of long-lived AWS keys.
- Production CDK resources retain data by default.
- API integration tests verify user isolation and delete behavior.

## Recommended Hardening Before Shared Corporate Use

- Change Mermaid to strict mode or isolate rendering in a sandboxed iframe.
- Store tokens in a BFF cookie model instead of SPA-accessible tokens.
- Add AWS WAF to CloudFront and the ALB.
- Add alarmed CloudWatch metrics for 5xx, latency, and auth failures.
- Replace broad GitHub deploy permissions with CDK bootstrap deployment roles scoped per environment.
- Add audit logging for create, update, delete, and failed authorization attempts.
