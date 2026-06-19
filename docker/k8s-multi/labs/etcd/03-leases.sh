#!/bin/bash
# Lab 03: Leases and TTL - how Kubernetes node heartbeats work
echo "=== Lab 03: etcd Leases (TTL) ==="
echo "1. Grant a 20-second lease"
LEASE=$(etcdctl lease grant 20 | awk "{print \$2}")
echo "Lease ID: $LEASE"
echo ""
echo "2. Attach a key to the lease"
etcdctl put /myapp/session myvalue --lease=$LEASE
etcdctl get /myapp/session
echo ""
echo "3. Check remaining TTL"
etcdctl lease timetolive $LEASE
echo ""
echo "4. Kubernetes uses leases for node heartbeats - see them:"
etcdctl get --prefix /registry/leases/ --keys-only | head -10
echo "=== Lab 03 complete ==="
