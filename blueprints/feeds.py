from flask import Blueprint, request, jsonify, session
from models import db, Feed, Zone
from helpers import serialize_feed, serialize_zone, login_required
import os, uuid, json
from flask import current_app as app

feeds_bp = Blueprint("feeds", __name__, url_prefix="/api/feeds")

@feeds_bp.route("", methods=["GET", "POST"])
@login_required
def feeds():
    if request.method == "GET":
        user_id = session.get("user_id")
        role = session.get("role")
        if role == "admin":
            feeds = Feed.query.all()
        else:
            feeds = Feed.query.filter_by(user_id=user_id).all()
        return jsonify([serialize_feed(f) for f in feeds])

    data = request.get_json()
    if not data.get("name") or not data.get("type"):
        return jsonify({"error": "Name and type required"}), 400
    if Feed.query.filter_by(name=data["name"]).first():
        return jsonify({"error": "Feed name must be unique"}), 400

    feed = Feed(name=data["name"], type=data["type"], user_id=session.get("user_id"))
    db.session.add(feed)
    db.session.commit()
    return jsonify({"status": "success", "feed": serialize_feed(feed)})


@feeds_bp.route("/<int:feed_id>/upload_video", methods=["POST"])
@login_required
def upload_video(feed_id):
    feed = Feed.query.filter_by(id=feed_id).first()
    if not feed:
        return jsonify({"error": "Feed not found"}), 404
    file = request.files.get("video")
    if not file or file.filename == "":
        return jsonify({"error": "No video file"}), 400

    videos_dir = os.path.join(app.root_path, "static", "videos")
    os.makedirs(videos_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
    file.save(os.path.join(videos_dir, filename))
    feed.video_filename = filename
    db.session.commit()
    return jsonify({"status": "success", "filename": filename})


@feeds_bp.route("/<int:feed_id>/zones", methods=["GET", "POST"])
@login_required
def zones(feed_id):
    if request.method == "GET":
        zones = Zone.query.filter_by(feed_id=feed_id).all()
        return jsonify([serialize_zone(z) for z in zones])

    data = request.get_json()
    Zone.query.filter_by(feed_id=feed_id).delete()
    for zone_data in data.get("zones", []):
        db.session.add(Zone(feed_id=feed_id, label=zone_data["label"], coordinates=json.dumps(zone_data["coordinates"])))
    db.session.commit()
    return jsonify({"status": "success"})


@feeds_bp.route("/<int:feed_id>/zones/<int:zone_id>", methods=["DELETE"])
@login_required
def delete_zone(feed_id, zone_id):
    zone = Zone.query.filter_by(id=zone_id, feed_id=feed_id).first()
    if not zone:
        return jsonify({"error": "Zone not found"}), 404
    db.session.delete(zone)
    db.session.commit()
    return jsonify({"status": "success"})

@feeds_bp.route("/<int:feed_id>", methods=["DELETE"])
@login_required
def delete_feed(feed_id):
    feed = Feed.query.filter_by(id=feed_id).first()
    if not feed:
        return jsonify({"error": "Feed not found"}), 404
    # Delete associated zones first
    Zone.query.filter_by(feed_id=feed_id).delete()
    db.session.delete(feed)
    db.session.commit()
    return jsonify({"status": "success"})
