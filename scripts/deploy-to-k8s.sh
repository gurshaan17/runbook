#!/bin/bash
kubectl apply -f k8s/demo-app-deployment.yaml
kubectl rollout status deployment/demo-app
kubectl get pods -l app=demo-app
kubectl get svc demo-app
