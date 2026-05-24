#!/usr/bin/env python3
"""
Fix arrow start/end positions and diagonal arrows in fundamentals excalidraw files.
All coordinates are post-80%-scaling values.
"""
import json
from pathlib import Path

DIAGRAMS = Path(__file__).resolve().parent.parent / "public" / "diagrams"

def load(path):
    return json.loads(path.read_text())

def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

def patch(elements, patches: dict):
    """patches: {id: {field: value, ...}}"""
    for el in elements:
        if el["id"] in patches:
            el.update(patches[el["id"]])
    return elements


# ─── api-gateway ─────────────────────────────────────────────────────────────
gw_path = DIAGRAMS / "fundamentals/source/api-gateway.excalidraw"
gw_data = load(gw_path)
gw_data["elements"] = patch(gw_data["elements"], {
    # Fix arrow-client-gw: start at client right edge (14.4+163.2=177.6), end at gw left (198.4)
    "arrow-client-gw": {"x": 177.6, "y": 240, "width": 20.8, "height": 0,
                         "points": [[0, 0], [20.8, 0]]},
    # Extend gw to cover notif service center (y=415 < 80+360=440)
    "gw": {"y": 80, "height": 360},
    # Fix gw-d2 text overflow: right was 429.6, gw right=424.8. Reduce width.
    "gw-d2": {"width": 190.0},
    # All gateway→service arrows: horizontal from gw right edge (424.8) to service left (446.4)
    "arrow-gw-user":    {"x": 424.8, "y": 115, "width": 21.6, "height": 0,
                          "points": [[0, 0], [21.6, 0]]},
    "arrow-gw-order":   {"x": 424.8, "y": 215, "width": 21.6, "height": 0,
                          "points": [[0, 0], [21.6, 0]]},
    "arrow-gw-payment": {"x": 424.8, "y": 315, "width": 21.6, "height": 0,
                          "points": [[0, 0], [21.6, 0]]},
    "arrow-gw-notif":   {"x": 424.8, "y": 415, "width": 21.6, "height": 0,
                          "points": [[0, 0], [21.6, 0]]},
    # Align svc-notif with other services (446.4 not 436.0)
    "svc-notif": {"x": 446.4},
})
save(gw_path, gw_data)
print("Fixed: api-gateway.excalidraw")


# ─── load-balancer ───────────────────────────────────────────────────────────
lb_path = DIAGRAMS / "fundamentals/source/load-balancer.excalidraw"
lb_data = load(lb_path)
lb_data["elements"] = patch(lb_data["elements"], {
    # Fix client→lb arrow: start at client right (22.4+163.2=185.6), end at lb left (217.6)
    "arrow-client-lb": {"x": 185.6, "y": 240, "width": 32.0, "height": 0,
                         "points": [[0, 0], [32.0, 0]]},
    # Extend lb to cover all server centers (y=120–360): new y=80, h=300
    "lb":  {"y": 80, "height": 300},
    # LB→WS arrows: horizontal from lb right (422.4) to ws left (438.4), gap=16
    # Each at its server's center_y (ws1=120, ws2=240, ws3=360)
    "arrow-lb-ws1": {"x": 422.4, "y": 120, "width": 16.0, "height": 0,
                      "points": [[0, 0], [16.0, 0]]},
    "arrow-lb-ws2": {"x": 422.4, "y": 240, "width": 16.0, "height": 0,
                      "points": [[0, 0], [16.0, 0]]},
    "arrow-lb-ws3": {"x": 422.4, "y": 360, "width": 16.0, "height": 0,
                      "points": [[0, 0], [16.0, 0]]},
    # Move DB to x=660 (gap 42.4 from ws right=617.6), extend height to cover ws centers
    "db":       {"x": 660.0, "y": 100, "width": 187.2, "height": 300},
    "db-label": {"x": 688.0, "y": 215, "width": 131.2},
    "db-sub":   {"x": 688.0, "y": 255, "width": 131.2},
    # WS→DB arrows: horizontal from ws right (617.6) to db left (660), gap=42.4
    "arrow-ws1-db": {"x": 617.6, "y": 120, "width": 42.4, "height": 0,
                      "points": [[0, 0], [42.4, 0]]},
    "arrow-ws2-db": {"x": 617.6, "y": 240, "width": 42.4, "height": 0,
                      "points": [[0, 0], [42.4, 0]]},
    "arrow-ws3-db": {"x": 617.6, "y": 360, "width": 42.4, "height": 0,
                      "points": [[0, 0], [42.4, 0]]},
    # Session store: move to below extended DB (bottom=400), give it clear space
    "session":       {"x": 668.0, "y": 420, "width": 136.0, "height": 60},
    "session-label": {"x": 668.0, "y": 428, "width": 136.0, "height": 31},
    "session-sub":   {"x": 668.0, "y": 453, "width": 131.2, "height": 31},
    # Push evidence and notes down to clear session
    "evidence-box":  {"y": 500, "height": 100},
    "evidence-text": {"y": 514, "height": 84},
    "note-label":    {"y": 500},
})
save(lb_path, lb_data)
print("Fixed: load-balancer.excalidraw")


# ─── sharded-database ────────────────────────────────────────────────────────
sd_path = DIAGRAMS / "fundamentals/source/sharded-database.excalidraw"
sd_data = load(sd_path)

# Move shard x from 454.4 → 520 (gap 72.8 from router right 447.2)
SHARD_DX = 520.0 - 454.4  # 65.6
sd_data["elements"] = patch(sd_data["elements"], {
    # Fix app→router arrow: start at app right (22.4+179.2=201.6), end at router left (228)
    "arrow-app-router": {"x": 201.6, "y": 220, "width": 26.4, "height": 0,
                          "points": [[0, 0], [26.4, 0]]},
    # Extend router to span all shard centers (y=120,235,350): y=80, h=300
    "router": {"y": 80, "height": 300},
    "router-label":   {"y": 120},
    "router-detail1": {"y": 165},
    "router-detail2": {"y": 193},
    "router-detail3": {"y": 221},
    # Router→shard arrows: horizontal from router right (447.2) to shard left (520)
    # shard0 center_y=70+50=120, shard1=185+50=235, shard2=300+50=350
    "arrow-router-s0": {"x": 447.2, "y": 120, "width": 72.8, "height": 0,
                         "points": [[0, 0], [72.8, 0]]},
    "arrow-router-s1": {"x": 447.2, "y": 235, "width": 72.8, "height": 0,
                         "points": [[0, 0], [72.8, 0]]},
    "arrow-router-s2": {"x": 447.2, "y": 350, "width": 72.8, "height": 0,
                         "points": [[0, 0], [72.8, 0]]},
    # Move shard boxes to x=520
    "shard0": {"x": 520.0},
    "shard1": {"x": 520.0},
    "shard2": {"x": 520.0},
    # Move shard labels/details (previously x=480/488, add 65.6)
    "shard0-label":   {"x": 545.6},
    "shard0-detail":  {"x": 553.6},
    "shard0-replica": {"x": 553.6},
    "shard1-label":   {"x": 545.6},
    "shard1-detail":  {"x": 553.6},
    "shard1-replica": {"x": 553.6},
    "shard2-label":   {"x": 545.6},
    "shard2-detail":  {"x": 553.6},
    "shard2-replica": {"x": 553.6},
})
save(sd_path, sd_data)
print("Fixed: sharded-database.excalidraw")


# ─── simple-cache: fix arrow start inside cache box ──────────────────────────
sc_path = DIAGRAMS / "fundamentals/source/simple-cache.excalidraw"
sc_data = load(sc_path)
# After scaling: cache x=238.4, w=197.6, right=436. db x=465.6.
# arrow-miss-db currently starts at x=419.2 (inside cache). Fix to start at cache right=436.
# db left=465.6. Gap=29.6.
sc_data["elements"] = patch(sc_data["elements"], {
    "arrow-miss-db":    {"x": 436.0, "y": 270, "width": 29.6, "height": 0,
                          "points": [[0, 0], [29.6, 0]]},
    "miss-arrow-label": {"x": 440.0, "y": 252, "width": 26.0},
})
save(sc_path, sc_data)
print("Fixed: simple-cache.excalidraw")

print("\nAll fundamentals arrow fixes applied.")
