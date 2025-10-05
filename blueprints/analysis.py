from flask import Blueprint, jsonify, request, Response, render_template, send_file
from models import Feed, Zone
from yolo_service import start_analysis, stop_analysis, get_counts, get_detections, toggle_deepsort, generate_frames
from helpers import scale_zones, login_required
import cv2, json
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

analysis_bp = Blueprint("analysis", __name__, url_prefix="/api/feeds")

@analysis_bp.route("/<int:feed_id>/start_analysis", methods=["POST"])
def start(feed_id):
    feed = Feed.query.get(feed_id)
    if not feed :
        return jsonify({"error": "Feed not found"}), 400

    if feed.type == "camera":
        # For camera feeds, use camera index 0
        video_source = 0
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return jsonify({"error": "Cannot open camera"}), 400
        w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
    elif feed.type == "video":
        if not feed.video_filename:
            return jsonify({"error": "No video file for video feed"}), 400
        video_source = f"static/videos/{feed.video_filename}"
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return jsonify({"error": "Cannot open video"}), 400
        w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
    else:
        return jsonify({"error": "Invalid feed type"}), 400

    zones, labels = scale_zones(Zone.query.filter_by(feed_id=feed_id).all(), w, h)
    start_analysis(feed_id, video_source, zones, labels)
    return jsonify({"status": "started"})

@analysis_bp.route("/<int:feed_id>/stop_analysis", methods=["POST"])
def stop(feed_id):
    stop_analysis(feed_id)
    return jsonify({"status": "stopped"})

@analysis_bp.route("/<int:feed_id>/counts")
def counts(feed_id):
    return jsonify(get_counts(feed_id))

@analysis_bp.route("/<int:feed_id>/detections")
def detections(feed_id):
    return jsonify(get_detections(feed_id))

@analysis_bp.route("/<int:feed_id>/report")
@login_required
def report(feed_id):
    feed = Feed.query.get(feed_id)
    if not feed:
        return "Feed not found", 404

    counts = get_counts(feed_id)
    detections = get_detections(feed_id)

    return render_template("analysis_report.html", feed=feed, counts=counts, detections=detections)

@analysis_bp.route("/<int:feed_id>/download_report")
@login_required
def download_report(feed_id):
    feed = Feed.query.get(feed_id)
    if not feed:
        return "Feed not found", 404

    counts = get_counts(feed_id)
    detections = get_detections(feed_id)

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, height - 50, f"Analysis Report for Feed: {feed.name}")

    p.setFont("Helvetica", 12)
    y = height - 80
    p.drawString(50, y, "Counts:")
    y -= 20
    for zone, count in counts.items():
        p.drawString(60, y, f"{zone}: {count}")
        y -= 15

    y -= 10
    p.drawString(50, y, "Detections:")
    y -= 20
    for detection in detections:
        p.drawString(60, y, f"{detection}")
        y -= 15
        if y < 50:
            p.showPage()
            y = height - 50

    p.showPage()
    p.save()
    buffer.seek(0)

    return send_file(buffer, as_attachment=True, download_name=f"{feed.name}_analysis_report.pdf", mimetype="application/pdf")

@analysis_bp.route("/<int:feed_id>/toggle_deepsort", methods=["POST"])
def toggle_deepsort_endpoint(feed_id):
    data = request.get_json()
    enabled = data.get("enabled", False)
    toggle_deepsort(feed_id, enabled)
    return jsonify({"status": "success"})

@analysis_bp.route("/<int:feed_id>/stream")
def stream(feed_id):
    return Response(generate_frames(feed_id), mimetype='multipart/x-mixed-replace; boundary=frame')

@analysis_bp.route("/<int:feed_id>/process_frame", methods=["POST"])
def process_feed_frame(feed_id):
    feed = Feed.query.get(feed_id)
    if not feed:
        return jsonify({"error": "Invalid feed"}), 400

    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({"error": "No image provided"}), 400

    image_data = data['image']

    # Get zones, scale to frame size
    zones_db = Zone.query.filter_by(feed_id=feed_id).all()
    # For camera, assume frame size is sent or default, but since we don't know, assume zones are in pixel coords as is.
    # For simplicity, assume zones are defined for the camera resolution, or scale if needed.
    # For now, use zones as is, assuming they match.

    zones, labels = [], []
    for z in zones_db:
        coords = json.loads(z.coordinates)
        # coords is dict with topleft etc.
        # Convert to (x1,y1,x2,y2)
        x1 = min(coords['topleft'][0], coords['bottomleft'][0])
        y1 = min(coords['topleft'][1], coords['topright'][1])
        x2 = max(coords['bottomright'][0], coords['topright'][0])
        y2 = max(coords['bottomright'][1], coords['bottomleft'][1])
        zones.append((x1, y1, x2, y2))
        labels.append(z.label)

    # counts, detections = process_frame(image_data, zones, labels)
    return jsonify({"counts": counts, "detections": detections})
