import json
from flask import session, redirect, url_for
from functools import wraps

def login_required(f):
    """Decorator for routes that need login"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("username"):
            return redirect(url_for("auth.login"))
        return f(*args, **kwargs)
    return wrapper

def serialize_feed(feed):
    
    return {
        'id': feed.id,
        'name': feed.name,
        'type': feed.type,
        'video_filename': feed.video_filename
    }

def serialize_zone(zone):
    return {
        'id': zone.id,
        'label': zone.label,
        'coordinates': json.loads(zone.coordinates)
    }

def scale_zones(zones_data, video_width, video_height, canvas_width=640, canvas_height=360):
    """Scale drawn zones to video resolution"""
    zones, labels = [], []
    scale_x, scale_y = video_width / canvas_width, video_height / canvas_height
    for z in zones_data:
        coords = json.loads(z.coordinates)
        points = list(coords.values())
        x1, y1 = min(p[0] for p in points), min(p[1] for p in points)
        x2, y2 = max(p[0] for p in points), max(p[1] for p in points)
        zones.append((int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y)))
        labels.append(z.label)
    return zones, labels
