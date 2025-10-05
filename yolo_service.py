import cv2
import threading
import time
import queue
import base64
import numpy as np
from ultralytics import YOLO
import time

try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    deepsort_available = True
except ImportError:
    deepsort_available = False
    print("DeepSort not available, running without tracking")


start = time.time()
model = YOLO("yolov8n.pt")
print("YOLO model loaded in", time.time() - start, "seconds")

# Warm up the model with a dummy inference to reduce first inference delay
dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
_ = model(dummy_frame, stream=True)
print("Model warmed up")

# Shared state
analysis_threads = {}
analysis_results = {}
analysis_detections = {}
stop_flags = {}  # Add stop flags for each feed
frame_queues = {}  # Queues for MJPEG frames per feed
latest_frame = {}  # Latest frame for polling
deepsort_trackers = {}  # DeepSort trackers per feed
deepsort_enabled = {}  # Toggle state per feed

def is_in_zone(x1, y1, x2, y2, zone_coords):
    zx1, zy1, zx2, zy2 = zone_coords
    cx = int((x1 + x2) / 2)
    cy = int((y1 + y2) / 2)
    return zx1 <= cx <= zx2 and zy1 <= cy <= zy2


def run_analysis(feed_id, video_source, zones, zone_labels):
    print(f"Starting analysis thread for feed {feed_id}")
    print(f"Video source: {video_source}")
    print(f"Zones: {zones}")
    print(f"Zone labels: {zone_labels}")

    # Handle both file paths and camera indices
    if isinstance(video_source, int):
        # Camera feed
        cap = cv2.VideoCapture(video_source)
    else:
        # Video file
        cap = cv2.VideoCapture(video_source)

    if not cap.isOpened():
        print(f"Failed to open video source: {video_source}")
        return

    frame_count = 0
    while cap.isOpened():
        # Check if we should stop
        if stop_flags.get(feed_id, False):
            print(f"Stopping analysis thread for feed {feed_id} due to stop flag")
            break

        ret, frame = cap.read()
        if not ret:
            print(f"End of video reached after {frame_count} frames")
            break

        frame_count += 1
        zone_counts = [0] * len(zones)
        results = model(frame, stream=True)

        detections = []
        person_count = 0

        # Prepare detections for DeepSort if enabled
        deepsort_dets = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                if model.names[cls_id] == "person":
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    
                    w,h=x2-x1,y2-y1
                    deepsort_dets.append([[x1,y1,w,h], conf, "person"])

        # Apply DeepSort tracking if enabled
        if deepsort_enabled.get(feed_id, False) and deepsort_available and feed_id in deepsort_trackers:
            tracks = deepsort_trackers[feed_id].update_tracks(deepsort_dets, frame=frame)
            for track in tracks:
                if not track.is_confirmed():
                    continue
                track_id = track.track_id
                ltrb = track.to_ltrb()
                x1, y1, x2, y2 = map(int, ltrb)
                
                cls_id = track.get_det_class() if hasattr(track, 'get_det_class') else "person"
                label = cls_id if isinstance(cls_id, str) else (results[0].names[cls_id] if cls_id is not None else "person")

                person_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)  # Blue color (BGR format)
                cv2.putText(frame, f"Person {track_id} ({label})", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)  # Blue color (BGR format)

                # Show DeepSort track IDs on console
                print(f"DeepSort Track ID: {track_id}  at bbox ({x1}, {y1}, {x2}, {y2})")

                # Check which zones this person is in
                for i, (zx1, zy1, zx2, zy2) in enumerate(zones):
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    print(f"Checking person center ({cx}, {cy}) against zone {zone_labels[i]} bounds ({zx1}, {zy1}, {zx2}, {zy2})")
                    if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                        zone_counts[i] += 1
                        print(f"✓ Person {track_id} at ({x1},{y1},{x2},{y2}) is in zone {zone_labels[i]}")

                detections.append({"bbox": [x1, y1, x2, y2], "label": "person", "track_id": track_id})
        else:
            # Use basic YOLO detections without tracking
            for det in deepsort_dets:
                x1, y1, w,h  = det[0]
                x2 = x1 + w
                y2 = y1 + h
                person_count += 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)  # Blue color (BGR format)
                cv2.putText(frame, "Person", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)  # Blue color (BGR format)

                # Check which zones this person is in
                for i, (zx1, zy1, zx2, zy2) in enumerate(zones):
                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    print(f"Checking person center ({cx}, {cy}) against zone {zone_labels[i]} bounds ({zx1}, {zy1}, {zx2}, {zy2})")
                    if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                        zone_counts[i] += 1
                        print(f"✓ Person at ({x1},{y1},{x2},{y2}) is in zone {zone_labels[i]}")

                detections.append({"bbox": [x1, y1, x2, y2], "label": "person"})

        # Create the results dictionary
        zones_dict = {zone_labels[i]: count for i, count in enumerate(zone_counts)}
        analysis_results[feed_id] = {
            "total": person_count,  # Total people detected in the entire frame
            "zones": zones_dict     # People detected within specific zones
        }
        analysis_detections[feed_id] = detections

        # Draw zones on the frame
        for i, (zx1, zy1, zx2, zy2) in enumerate(zones):
            cv2.rectangle(frame, (zx1, zy1), (zx2, zy2), (0, 255, 0), 2)  # Green color for zones
            cv2.putText(frame, zone_labels[i], (zx1, zy1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Encode frame to JPEG and enqueue for streaming
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        jpeg_bytes = buffer.tobytes()
        if feed_id in frame_queues:
            try:
                frame_queues[feed_id].put(jpeg_bytes, block=False)
            except queue.Full:
                pass  # Skip frame if queue is full
        latest_frame[feed_id] = jpeg_bytes

        print(f"Frame {frame_count}: Found {person_count} persons, zone counts: {zones_dict}")

        time.sleep(0.2)  # prevent 100% CPU

    cap.release()
    print(f"Analysis thread for feed {feed_id} finished")

def start_analysis(feed_id, video_source, zones, zone_labels=None):
    if feed_id in analysis_threads:
        return
    if zone_labels is None:
        zone_labels = [f"Zone {i+1}" for i in range(len(zones))]
    # Clear any existing stop flag
    stop_flags.pop(feed_id, None)
    frame_queues[feed_id] = queue.Queue(maxsize=5)
    t = threading.Thread(target=run_analysis, args=(feed_id, video_source, zones, zone_labels), daemon=True)
    analysis_threads[feed_id] = t
    t.start()

def stop_analysis(feed_id):
    print(f"Stopping analysis for feed {feed_id}")
    stop_flags[feed_id] = True  # Set stop flag

    # Wait for thread to finish if it exists
    if feed_id in analysis_threads:
        thread = analysis_threads[feed_id]
        thread.join(timeout=1.0)  # Wait up to 1 second for thread to finish
        if thread.is_alive():
            print(f"Warning: Thread for feed {feed_id} did not stop gracefully")
        del analysis_threads[feed_id]

    # Clean up after thread has stopped
    analysis_results.pop(feed_id, None)
    analysis_detections.pop(feed_id, None)
    stop_flags.pop(feed_id, None)  # Clean up stop flag
    if feed_id in frame_queues:
        del frame_queues[feed_id]
    if feed_id in latest_frame:
        del latest_frame[feed_id]
    print(f"Analysis stopped for feed {feed_id}")

def get_counts(feed_id):
    return analysis_results.get(feed_id, {"total": 0, "zones": {}})

def get_detections(feed_id):
    return analysis_detections.get(feed_id, [])

def toggle_deepsort(feed_id, enabled):
    """Toggle DeepSort tracking for a feed"""
    deepsort_enabled[feed_id] = enabled
    if enabled and deepsort_available:
        if feed_id not in deepsort_trackers:
            deepsort_trackers[feed_id] = DeepSort(max_age=30, n_init=1)
        print(f"DeepSort enabled for feed {feed_id}")
    else:
        if feed_id in deepsort_trackers:
            del deepsort_trackers[feed_id]
            
def generate_frames(feed_id):
    """Generator for MJPEG stream frames."""
    while True:
        if stop_flags.get(feed_id, False):
            break
        if feed_id in latest_frame:
            frame_bytes = latest_frame[feed_id]
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # Wait ~30ms for next frame

def process_frame(image_data, zones, labels):
    """Process a single frame for detections and zone counts."""
    # Decode base64 image data
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    zone_counts = [0] * len(zones)
    results = model(frame, stream=True)

    detections = []

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            if model.names[cls_id] == "person":
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])

                detections.append({"bbox": [x1, y1, x2, y2], "label": "person", "confidence": conf})

                # Check which zones this person is in
                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)
                for i, (zx1, zy1, zx2, zy2) in enumerate(zones):
                    if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                        zone_counts[i] += 1

    counts = {labels[i]: count for i, count in enumerate(zone_counts)}
    return counts, detections
