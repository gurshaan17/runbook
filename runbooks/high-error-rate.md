# High Error Rate Runbook

## Detection
Error rate exceeds 5% for more than 1 minute.

## Steps
1. Check recent deployments (last 15 minutes)
2. Analyze error patterns in logs
3. If new deployment detected, rollback to previous version
4. If no recent deployment, scale to distribute load
5. Verify error rate returns to normal

## Rollback Plan
If errors persist:
- Scale to 6 replicas
- Enable debug logging
- Alert on-call engineer
