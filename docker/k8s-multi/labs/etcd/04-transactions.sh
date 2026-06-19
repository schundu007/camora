#!/bin/bash
# Lab 04: Transactions (CAS) - compare-and-swap atomicity
echo "=== Lab 04: etcd Transactions ==="
echo "1. Put initial value"
etcdctl put /myapp/counter 0
echo ""
echo "2. Read current revision"
etcdctl get /myapp/counter --write-out=json | python3 -c "import sys,json; d=json.load(sys.stdin); print('Revision:', d["header"]["revision"])"
echo ""
echo "3. Key revision and value stored in K8s etcd:"
etcdctl get --prefix /registry/namespaces/ --keys-only
echo "=== Lab 04 complete ==="
