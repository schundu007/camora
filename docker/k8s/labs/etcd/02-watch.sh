#!/bin/bash
# Lab 02: Watch API - see etcd events in real time
echo "=== Lab 02: etcd Watch API ==="
echo "Watching /myapp/ prefix for 30 seconds..."
echo "Open another terminal: etcdctl put /myapp/test hello"
timeout 30 etcdctl watch --prefix /myapp/ || true
echo ""
echo "=== Lab 02 complete ==="
