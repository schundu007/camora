#!/bin/bash
# Lab 05: Explore Kubernetes state stored in etcd
echo "=== Lab 05: Kubernetes State in etcd ==="
echo "1. All resource types K8s stores in etcd:"
etcdctl get --prefix /registry/ --keys-only | sed "s|/registry/||" | cut -d/ -f1 | sort -u
echo ""
echo "2. List all pods stored in etcd:"
etcdctl get --prefix /registry/pods/ --keys-only
echo ""
echo "3. etcd cluster member list:"
etcdctl member list --write-out=table
echo ""
echo "4. etcd leader and status:"
etcdctl endpoint status --write-out=table
echo "=== Lab 05 complete ==="
