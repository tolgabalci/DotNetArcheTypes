# Runbook

## Local Run

1. Install .NET 10 SDK and Docker Desktop or OrbStack.
2. Run `dotnet restore MermaidNotes.slnx`.
3. Run `dotnet run --project src/apphost/MermaidNotes.AppHost.csproj`.
4. Open the Vite URL from the Aspire dashboard.

## First AWS Bootstrap

1. Configure AWS CLI with an administrator or platform-engineering bootstrap identity.
2. Run `npx cdk bootstrap` in `infra/cdk`.
3. Deploy staging once from a trusted local workstation.
4. Copy the `GitHubDeployRoleArn` output into the `staging` GitHub Environment secret `AWS_DEPLOY_ROLE_ARN`.
5. Copy `ApiUrl`, `CognitoAuthority`, and `CognitoClientId` outputs into the matching GitHub Environment variables.
6. Repeat for production after reviewing CDK diff.

## Deploy

Merging to `main` triggers staging deploy. Production deploy waits for GitHub Environment approval.

## Rollback

- For frontend-only issues, redeploy the previous workflow run or sync the previous built artifact to the web bucket.
- For API issues, redeploy the previous container/CDK asset from a known-good workflow run.
- For database migration issues, stop traffic first, restore from RDS snapshot if needed, and write a forward fix migration.

## Incident Checklist

- Check ALB target health.
- Check ECS task events and logs.
- Check RDS connectivity and CPU/storage.
- Check Cognito app client callback/logout URLs.
- Check CloudFront invalidation status for frontend deploys.
