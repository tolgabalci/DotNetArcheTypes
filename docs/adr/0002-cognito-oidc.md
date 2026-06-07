# ADR 0002: Amazon Cognito OIDC

## Status

Accepted.

## Decision

Use Amazon Cognito Hosted UI as the first OIDC provider. The React SPA uses Authorization Code + PKCE and the API validates Cognito JWT bearer tokens.

## Rationale

Cognito gives this reference app an end-to-end AWS identity story that can be provisioned with CDK. It is a stronger AWS deployment example than a purely generic OIDC configuration while still relying on standards-based OIDC primitives.

## Consequences

- Local development needs either a provisioned dev Cognito client or the documented mock auth mode.
- GitHub deployment must update Cognito callback/logout URLs for each environment.
- API authorization must scope every resource operation by the token subject.
