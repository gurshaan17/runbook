# Memory Spike Runbook

## Detection
Container memory usage exceeds 80% for more than 2 minutes.

## Steps
1. Check if this is a known memory leak pattern
2. Restart the affected container to free memory
3. Scale service to +2 replicas for redundancy
4. Monitor memory usage for 3 minutes
5. If stable, mark incident as resolved

## Rollback Plan
If memory continues to climb after restart:
- Scale to 5 total replicas
- Alert on-call engineer
- Prepare for manual investigation
