# ADR 0004: Mermaid Loose Rendering

## Status

Accepted with risk.

## Decision

Configure Mermaid with `securityLevel: "loose"` for the v1 editor and feed renderer.

## Rationale

The product goal prioritizes rich Mermaid authoring. Loose rendering allows more Mermaid features and aligns with the requested behavior.

## Mitigations

- Render on the client, not the server.
- Sanitize rendered SVG with DOMPurify.
- Use a restrictive Content Security Policy.
- Keep entries private per user in v1.
- Document strict rendering as the recommended corporate default.

## Consequences

Loose rendering increases XSS review burden. Before enabling shared/team feeds or untrusted collaboration, revisit this ADR and prefer strict rendering unless a concrete feature requires loose mode.
