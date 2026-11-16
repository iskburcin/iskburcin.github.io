"""Build assets/src/tr-admin.json: Türkiye province + district borders as SVG paths
in the same coordinate system as assets/src/world.svg (Mercator, mapsvg:geoViewBox).

Data: geoBoundaries (gbOpen TUR ADM1 + ADM2), from OpenStreetMap.
  ADM1: CC BY-SA 2.0 · ADM2: ODbL 1.0 · © OpenStreetMap contributors

Usage:
  python tools/build_tr_admin.py <ADM1.geojson> <ADM2.geojson>
"""
import json, math, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
svg = open(os.path.join(ROOT, "assets", "src", "world.svg"), encoding="utf-8").read()
lon0, lat0, lon1, lat1 = map(float, re.search(r'mapsvg:geoViewBox="([^"]+)"', svg).group(1).split())
W = float(re.search(r'width="([\d.]+)"', svg).group(1))
H = float(re.search(r'height="([\d.]+)"', svg).group(1))

merc = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
M0, M1 = merc(lat0), merc(lat1)

def project(lon, lat):
    return ((lon - lon0) / (lon1 - lon0) * W, (M0 - merc(lat)) / (M0 - M1) * H)

def simplify(points, tol):
    """Douglas–Peucker line simplification (iterative)."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-12
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            dist = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if dist > best:
                best, idx = dist, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]

def simplify_ring(points, tol):
    """A closed ring starts and ends at the same point, so split it at the
    point farthest from the start and simplify the two halves."""
    if points[0] == points[-1]:
        points = points[:-1]
    if len(points) < 4:
        return points
    x0, y0 = points[0]
    k = max(range(len(points)), key=lambda i: (points[i][0] - x0) ** 2 + (points[i][1] - y0) ** 2)
    return simplify(points[: k + 1], tol)[:-1] + simplify(points[k:] + [points[0]], tol)[:-1]

def ring_to_path(ring, tol):
    pts = simplify_ring([project(lon, lat) for lon, lat in ring], tol)
    if len(pts) < 4:
        return ""
    # first point absolute, the rest relative: shorter text
    out = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    cx, cy = round(pts[0][0], 2), round(pts[0][1], 2)
    rel = []
    for x, y in pts[1:]:
        x, y = round(x, 2), round(y, 2)
        rel.append(f"{x - cx:.2f} {y - cy:.2f}".replace("-0.00", "0.00").replace(".00", ""))
        cx, cy = x, y
    return out[0] + "l" + " ".join(rel) + "z"

def feature_path(geom, tol):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    parts = [ring_to_path(r, tol) for poly in polys for r in poly[:1]]  # outer rings only
    return "".join(p for p in parts if p)

def build(path, tol):
    feats = json.load(open(path, encoding="utf-8"))["features"]
    out = []
    for f in feats:
        d = feature_path(f["geometry"], tol)
        if d:
            out.append({"n": f["properties"]["shapeName"], "d": d})
    return out

if __name__ == "__main__":
    adm1, adm2 = sys.argv[1], sys.argv[2]
    data = {
        "credit": "Borders: geoBoundaries / © OpenStreetMap contributors (ODbL, CC BY-SA)",
        "provinces": build(adm1, 0.02),
        "districts": build(adm2, 0.012),
    }
    dest = os.path.join(ROOT, "assets", "src", "tr-admin.json")
    with open(dest, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    print(dest, os.path.getsize(dest) // 1024, "KB,", len(data["provinces"]), "provinces,", len(data["districts"]), "districts")
