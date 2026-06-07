# Cost and Scaling Notes

## Cost Drivers

- ECS Fargate CPU and memory allocation.
- RDS instance class, storage, backups, and Multi-AZ.
- NAT Gateway count and data processing.
- CloudFront requests and data transfer.
- CloudWatch log retention.

## Staging Defaults

Staging uses one Fargate task, one NAT Gateway, single-AZ RDS, shorter log retention, and destroyable resources where safe.

## Production Defaults

Production uses retained stateful resources, two desired API tasks, Multi-AZ RDS, longer backup retention, and retained logs.

## Scaling Path

1. Add ECS autoscaling on ALB request count and CPU.
2. Move API database reads to read replicas if feed/search traffic grows.
3. Add OpenSearch only if PostgreSQL search relevance or indexing becomes insufficient.
4. Add Redis only if feed cache pressure appears in metrics.
5. Split modules into services only when team ownership or scaling needs justify distributed operations.
