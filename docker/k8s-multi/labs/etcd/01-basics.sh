#!/bin/bash
# Lab 01: etcd Basics inside a live Kubernetes cluster
echo "=== Lab 01: etcd Key-Value Basics ==="
echo "1. Check etcd health"
etcdctl endpoint health
echo ""
echo "2. Store your own keys"
etcdctl put /myapp/env production
etcdctl put /myapp/version 1.0.0
echo ""
echo "3. Read keys"
etcdctl get /myapp/env
etcdctl get --prefix /myapp/
echo ""
echo "4. See Kubernetes data in etcd (keys only, first 20)"
etcdctl get --prefix /registry/ --keys-only | head -20
echo ""
echo "5. Delete your key"
etcdctl del /myapp/env
echo "=== Lab 01 complete ==="
