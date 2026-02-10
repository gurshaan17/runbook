# CPU Overload Runbook

## Detection
CPU usage exceeds 90% for more than 2 minutes.

## Steps
1. Identify if CPU spike is from specific endpoint
2. Check for infinite loops or heavy processing
3. Scale service to +3 replicas immediately
4. Monitor CPU distribution across replicas
5. If specific endpoint identified, rate limit it

## Rollback Plan
If CPU remains high:
- Scale to 8 total replicas
- Enable request throttling
- Alert on-call engineer
