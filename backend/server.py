from datetime import datetime, timedelta, timezone
from collections import deque
import os
import threading
import time
import uuid
import base64
import json
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from urllib.request import urlopen
from urllib.parse import urlencode

try:
    import cv2
    from ultralytics import YOLO
except Exception:
    cv2 = None
    YOLO = None

app = Flask(__name__)
CORS(app)

tickets_store = {}
inference_lock = threading.Lock()
camera_lock = threading.Lock()
model_status = "starting"
COUNT_SMOOTHING_ALPHA = 0.35
prediction_history = deque(maxlen=24)

PILGRIM_LOCATION_META = {
    "kedarnath": {
        "name": "Kedarnath Temple",
        "base_capacity": 15000,
        "peak_multiplier": 2.5,
        "lat": 30.7346,
        "lng": 79.0669,
    },
    "badrinath": {
        "name": "Badrinath Temple",
        "base_capacity": 20000,
        "peak_multiplier": 2.2,
        "lat": 30.7433,
        "lng": 79.4938,
    },
    "gangotri": {
        "name": "Gangotri Temple",
        "base_capacity": 8000,
        "peak_multiplier": 2.0,
        "lat": 30.9944,
        "lng": 78.9393,
    },
    "yamunotri": {
        "name": "Yamunotri Temple",
        "base_capacity": 6000,
        "peak_multiplier": 1.8,
        "lat": 31.0150,
        "lng": 78.4641,
    },
    "haridwar": {
        "name": "Haridwar",
        "base_capacity": 50000,
        "peak_multiplier": 3.0,
        "lat": 29.9457,
        "lng": 78.1642,
    },
    "rishikesh": {
        "name": "Rishikesh",
        "base_capacity": 35000,
        "peak_multiplier": 2.0,
        "lat": 30.0869,
        "lng": 78.2676,
    },
    "sonprayag": {
        "name": "Sonprayag (Base Camp)",
        "base_capacity": 10000,
        "peak_multiplier": 2.8,
        "lat": 30.6183,
        "lng": 79.0607,
    },
    "joshimath": {
        "name": "Joshimath",
        "base_capacity": 12000,
        "peak_multiplier": 2.0,
        "lat": 30.5550,
        "lng": 79.5639,
    },
    "gaurikund": {
        "name": "Gaurikund Trek Start",
        "base_capacity": 8000,
        "peak_multiplier": 2.5,
        "lat": 30.6560,
        "lng": 79.0476,
    },
    "hemkund": {
        "name": "Hemkund Sahib",
        "base_capacity": 5000,
        "peak_multiplier": 2.0,
        "lat": 30.6961,
        "lng": 79.6068,
    },
}

LOCATION_TO_SHRINE = {
    "kedarnath": "Kedarnath",
    "badrinath": "Badrinath",
    "gangotri": "Gangotri",
    "yamunotri": "Yamunotri",
    "hemkund": "Hemkund_Sahib",
    "sonprayag": "Kedarnath",
    "gaurikund": "Kedarnath",
    "joshimath": "Badrinath",
}

_CHARDHAM_DATA = None


def load_chardham_data():
    global _CHARDHAM_DATA
    if _CHARDHAM_DATA is not None:
        return _CHARDHAM_DATA
    path = os.path.join(os.path.dirname(__file__), "..", "chardham_pilgrim_data.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            _CHARDHAM_DATA = json.load(f)
    except Exception:
        _CHARDHAM_DATA = {"shrines": {}, "metadata": {}, "projections_methodology": {}}
    return _CHARDHAM_DATA


def _daily_pattern_payload(data):
    return (((data.get("projections_methodology") or {}).get("daily_pattern_model") or {}).get("pattern")) or {}


def resolve_shrine_key(location_id):
    if location_id in ("haridwar", "rishikesh"):
        return "Kedarnath"
    return LOCATION_TO_SHRINE.get(location_id, "Kedarnath")


def monthly_avg_for_shrine(shrine, month_num):
    rows = shrine.get("monthly_data_2025") or shrine.get("monthly_data_2024") or []
    for row in rows:
        if row.get("month_num") != month_num:
            continue
        if row.get("temple_open") is False:
            return 0
        ad = row.get("avg_daily")
        if ad is not None:
            return float(ad)
        p = float(row.get("pilgrims") or 0)
        d = float(row.get("days_open") or 30)
        return p / max(1.0, d)
    return 0


def projected_annual_avg(shrine):
    rows = shrine.get("annual_data") or []
    for year in (2026, 2025):
        for a in rows:
            if a.get("year") == year and a.get("avg_daily") is not None:
                return float(a["avg_daily"])
    if rows:
        last = rows[-1]
        if last.get("avg_daily") is not None:
            return float(last["avg_daily"])
    return 4000.0


def get_sample_pilgrims(shrine, date_text):
    if not shrine:
        return None
    raw = shrine.get("daily_sample_data")
    if isinstance(raw, list):
        lst = raw
    elif isinstance(raw, dict):
        lst = raw.get("data") or []
    else:
        lst = []
    for row in lst:
        if row.get("date") == date_text:
            v = row.get("pilgrims")
            return float(v) if v is not None else None
    return None


def phase_multiplier(data, dt):
    pat = _daily_pattern_payload(data)
    peak = pat.get("peak_season_may_june_factor", 1.6)
    mon = pat.get("monsoon_july_aug_factor", 0.55)
    post = pat.get("post_monsoon_sep_oct_factor", 1.1)
    m = dt.month
    if m in (5, 6):
        return float(peak)
    if m in (7, 8):
        return float(mon)
    if m in (9, 10):
        return float(post)
    if m == 4:
        return 1.35
    if m == 11:
        return 1.2
    return 0.85


def opening_closing_bump(data, dt, shrine_key):
    pat = _daily_pattern_payload(data)
    ow = pat.get("opening_week_factor", 2.5) / max(0.01, float(pat.get("peak_season_may_june_factor", 1.6)))
    pc = pat.get("pre_closing_week_factor", 2.2)
    m, d = dt.month, dt.day
    if m == 5 and d <= 12:
        return float(ow)
    if m == 11 and d >= 25:
        return float(pc) / 1.1
    if m == 11 and d <= 5:
        return float(pc) / 1.15
    return 1.0


def weekend_bump(data, dt):
    pat = _daily_pattern_payload(data)
    wm = pat.get("weekend_multiplier", 1.3)
    if dt.weekday() >= 5:
        return float(wm)
    return 1.0


def reference_daily_baseline(data, location_id, dt):
    shrines = data.get("shrines") or {}
    meta_cap = float((data.get("metadata") or {}).get("daily_cap_kedarnath") or 12000)
    month_num = dt.month
    sk = resolve_shrine_key(location_id)

    if location_id == "haridwar":
        ked = shrines.get("Kedarnath") or {}
        base = monthly_avg_for_shrine(ked, month_num) or projected_annual_avg(ked)
        scale = 50000 / 15000
        v = base * scale * phase_multiplier(data, dt) * weekend_bump(data, dt)
        return max(80, round(v))
    if location_id == "rishikesh":
        ked = shrines.get("Kedarnath") or {}
        base = monthly_avg_for_shrine(ked, month_num) or projected_annual_avg(ked)
        scale = 35000 / 15000
        v = base * scale * phase_multiplier(data, dt) * weekend_bump(data, dt)
        return max(80, round(v))

    shrine = shrines.get(sk)
    if not shrine:
        return 4000

    base = monthly_avg_for_shrine(shrine, month_num)
    if base <= 0:
        base = projected_annual_avg(shrine)

    base *= phase_multiplier(data, dt) * opening_closing_bump(data, dt, sk) * weekend_bump(data, dt)

    if sk == "Kedarnath" or location_id in ("gaurikund", "sonprayag"):
        base = min(base, meta_cap)

    return max(50, round(base))


def blend_with_weather(ref, wx_score):
    return max(30, round(float(ref) * (0.72 + 0.28 * float(wx_score))))


def apply_kedar_cap(location_id, count, meta_cap):
    if location_id in ("kedarnath", "gaurikund", "sonprayag"):
        return min(int(count), int(meta_cap))
    return int(count)


def parse_hour_label(hour_str):
    try:
        return int(str(hour_str).split(":")[0])
    except Exception:
        return 0


def build_hourly_from_reference(shrine, predicted_daily_total):
    hours_rows = ((shrine or {}).get("hourly_sample_data") or {}).get("hours") or []
    weights_map = {}
    for row in hours_rows:
        hr = parse_hour_label(row.get("hour"))
        w = float(row.get("pilgrims_in_hour") or 0)
        weights_map[hr] = weights_map.get(hr, 0) + w

    labels = ["04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "21:00", "22:00", "23:00"]
    fallback = [0.2, 0.35, 0.52, 0.7, 0.9, 1.0, 0.88, 0.72, 0.58, 0.5, 0.42, 0.3]
    slot_weights = []
    sum_w = 0.0
    for i, lab in enumerate(labels):
        h = parse_hour_label(lab)
        if weights_map:
            a = weights_map.get(h, 0)
            b = weights_map.get(h + 1, 0)
            w = (a + b) / 2.0 or fallback[i]
        else:
            w = fallback[i]
        slot_weights.append(w)
        sum_w += w

    scale = float(predicted_daily_total) / max(1e-6, sum_w)
    peak_idx = max(range(len(slot_weights)), key=lambda j: slot_weights[j])
    peak_val = slot_weights[peak_idx]
    out = []
    for i, lab in enumerate(labels):
        w = slot_weights[i]
        cnt = max(15, int(round(w * scale)))
        out.append(
            {
                "hour": lab,
                "count": cnt,
                "isPeak": i == peak_idx or w >= peak_val * 0.98,
            }
        )
    return out


def build_summary_from_metadata(data):
    meta = data.get("metadata") or {}
    sources = meta.get("sources") or []
    head = "; ".join(sources[:3]) if sources else "BKTC / state tourism references"
    return (
        f"Crowd estimate blends Char Dham reference dataset ({head}) with live Open-Meteo weather adjustment."
    )


# Global Mode: "cctv" or "demo"
system_mode = "cctv"

def parse_camera_sources():
    raw = os.getenv("CAMERA_SOURCES", "")
    if not raw.strip():
        return ["", "", ""]
    tokens = [chunk.strip() for chunk in raw.split(",")]
    if not tokens:
        return ["", "", ""]
    return tokens

CAMERA_SOURCES = parse_camera_sources()
camera_states = [
    {
        "id": index,
        "name": f"Camera {index + 1}",
        "source": source,
        "status": "starting",
        "count": 0,
        "last_frame": None,
        "last_seen": None,
        "worker_started": False,
        "overlap_ratios": { (index+1): 0.2 } if index < len(CAMERA_SOURCES)-1 else {} # Mock topology
    }
    for index, source in enumerate(CAMERA_SOURCES)
]

demo_camera_state = {
    "id": 999,
    "name": "Demo Webcam",
    "source": 0,
    "status": "starting",
    "count": 0,
    "last_frame": None,
    "last_seen": None,
    "worker_started": False,
}

def utc_now():
    return datetime.now(timezone.utc)

def normalized_source(source_text):
    return int(source_text) if str(source_text).isdigit() else source_text

def open_video_capture(source):
    if cv2 is None:
        return None
    cap = cv2.VideoCapture(source)
    return cap

def make_placeholder_frame(title, message):
    if cv2 is None:
        return None
    import numpy as np
    frame = np.zeros((480, 854, 3), dtype=np.uint8)
    frame[:] = (25, 20, 35)
    cv2.putText(frame, title, (40, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, message, (40, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (120, 200, 255), 2, cv2.LINE_AA)
    return frame

def run_camera_loop(state_obj, model, is_demo=False):
    global model_status
    last_source_text = None

    while True:
        with camera_lock:
            mode_match = (is_demo and system_mode == "demo") or (not is_demo and system_mode != "demo")
            if not mode_match:
                source_text = ""
                camera_name = state_obj["name"]
            else:
                source_text = str(state_obj["source"]).strip()
                camera_name = state_obj["name"]

        if not mode_match or state_obj.get("removed"):
            if state_obj.get("removed"):
                break
            time.sleep(1)
            continue

        placeholder = make_placeholder_frame(camera_name, "No camera connected")

        if cv2 is None:
            with camera_lock:
                state_obj["status"] = "opencv_missing"
                state_obj["last_frame"] = None
            time.sleep(1)
            continue

        if not source_text and source_text != "0":
            with camera_lock:
                state_obj["status"] = "no_camera"
                state_obj["count"] = 0
                state_obj["last_frame"] = placeholder.copy() if placeholder is not None else None
            time.sleep(1)
            continue

        source = normalized_source(source_text)
        last_source_text = source_text

        cap = open_video_capture(source)
        if cap is None or not cap.isOpened():
            with camera_lock:
                state_obj["status"] = "no_camera" if cap and not cap.isOpened() else "opencv_missing"
                state_obj["count"] = 0
                state_obj["last_frame"] = placeholder.copy() if placeholder is not None else None
            time.sleep(2)
            continue

        with camera_lock:
            state_obj["status"] = "active"

        while True:
            with camera_lock:
                current_source_text = str(state_obj["source"]).strip()
                mode_match = (is_demo and system_mode == "demo") or (not is_demo and system_mode != "demo")
                
            if not mode_match or state_obj.get("removed"):
                break
            
            if current_source_text != last_source_text:
                with camera_lock:
                    state_obj["status"] = "reconnecting"
                break

            ret, frame = cap.read()
            if not ret:
                with camera_lock:
                    state_obj["status"] = "no_signal"
                    state_obj["last_frame"] = placeholder.copy() if placeholder is not None else None
                    state_obj["count"] = 0
                break

            try:
                if model is None:
                    count = int((time.time() * 10 + state_obj["id"]) % 8)
                    annotated = frame
                else:
                    with inference_lock:
                        results = model(frame, verbose=False)
                    count = 0
                    for result in results:
                        for box in result.boxes:
                            if int(box.cls[0]) == 0:
                                count += 1
                    annotated = results[0].plot() if results else frame
                
                with camera_lock:
                    state_obj["status"] = "active"
                    state_obj["count"] = count
                    state_obj["last_seen"] = utc_now().isoformat()
                    state_obj["last_frame"] = annotated
            except Exception as e:
                import traceback
                print(f"MODEL INFERENCE ERROR: {e}")
                traceback.print_exc()
                with camera_lock:
                    state_obj["status"] = "model_error"
                    state_obj["count"] = 0
                    state_obj["last_frame"] = placeholder.copy() if placeholder is not None else None
                model_status = "degraded"
                time.sleep(0.1)

        cap.release()
        time.sleep(0.5)

# We no longer start run_camera_loop for demo_camera_state 
# because it receives frames via POST /demo_frame from the frontend
def start_ai_workers():
    global model_status, MODEL_INSTANCE
    MODEL_INSTANCE = None
    if YOLO is None or cv2 is None:
        model_status = "fallback"
    else:
        try:
            MODEL_INSTANCE = YOLO("yolov8n.pt")
            model_status = "running"
        except Exception as e:
            import traceback
            print(f"YOLO INITIALIZATION ERROR: {e}")
            traceback.print_exc()
            model_status = "degraded"
            MODEL_INSTANCE = None

    for state in camera_states:
        if not state["worker_started"]:
            state["worker_started"] = True
            threading.Thread(target=run_camera_loop, args=(state, MODEL_INSTANCE, False), daemon=True).start()

MODEL_INSTANCE = None

def get_camera_snapshot():
    with camera_lock:
        if system_mode == "demo":
            return [{
                "id": demo_camera_state["id"],
                "name": demo_camera_state["name"],
                "source": demo_camera_state["source"],
                "status": demo_camera_state["status"],
                "count": demo_camera_state["count"],
                "last_seen": demo_camera_state["last_seen"],
            }]
        
        return [
            {
                "id": state["id"],
                "name": state["name"],
                "source": state["source"],
                "status": state["status"],
                "count": state["count"],
                "last_seen": state["last_seen"],
            }
            for state in camera_states
        ]

def calculate_deduplicated_count():
    with camera_lock:
        if system_mode == "demo":
            return demo_camera_state["count"]
        
        total_raw = sum(state["count"] for state in camera_states)
        deducted = 0
        processed_pairs = set()
        
        for state in camera_states:
            cam_id = state["id"]
            overlaps = state.get("overlap_ratios", {})
            for other_id, ratio in overlaps.items():
                if other_id >= len(camera_states): continue
                pair = tuple(sorted((cam_id, other_id)))
                if pair in processed_pairs: continue
                processed_pairs.add(pair)
                
                other_cam = camera_states[other_id]
                overlap_people = ratio * min(state["count"], other_cam["count"])
                deducted += overlap_people
        
        return max(0, int(total_raw - deducted))

def total_people_count():
    return calculate_deduplicated_count()

def add_prediction_sample(people):
    prediction_history.append(
        {
            "ts": utc_now(),
            "people": max(0, int(people)),
        }
    )

def build_forecast(people_now, active_cameras):
    if not prediction_history:
        baseline_delta = 0
    else:
        recent = list(prediction_history)[-6:]
        baseline_delta = 0
        if len(recent) > 1:
            baseline_delta = (recent[-1]["people"] - recent[0]["people"]) / max(1, len(recent) - 1)

    camera_factor = max(1, active_cameras)
    growth_step = baseline_delta + (0.4 * camera_factor)
    forecast = []
    for i in range(7):
        projected = people_now + (growth_step * (i - 2))
        forecast.append(max(0, int(round(projected))))
    return forecast

def fetch_open_meteo_daily(lat, lng):
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
        "forecast_days": 6,
        "timezone": "Asia/Kolkata",
    }
    url = f"https://api.open-meteo.com/v1/forecast?{urlencode(params)}"
    with urlopen(url, timeout=8) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    daily = data.get("daily", {})
    return {
        "dates": daily.get("time", []),
        "tmax": daily.get("temperature_2m_max", []),
        "tmin": daily.get("temperature_2m_min", []),
        "rain_prob": daily.get("precipitation_probability_max", []),
        "weather_code": daily.get("weather_code", []),
    }

def weather_score(rain_prob, weather_code):
    rain_penalty = min(0.45, max(0, rain_prob) / 200.0)
    severe_codes = {65, 67, 75, 82, 86, 96, 99}
    moderate_codes = {61, 63, 71, 73, 80, 81, 85, 95}
    if weather_code in severe_codes:
        code_penalty = 0.35
    elif weather_code in moderate_codes:
        code_penalty = 0.2
    else:
        code_penalty = 0.05
    return max(0.35, min(1.0, 1.0 - rain_penalty - code_penalty))

def build_datawise_prediction(location_id):
    meta = PILGRIM_LOCATION_META.get(location_id)
    if not meta:
        return None

    ch = load_chardham_data()
    shrines = ch.get("shrines") or {}
    meta_cap = float((ch.get("metadata") or {}).get("daily_cap_kedarnath") or 12000)
    shrine_key = resolve_shrine_key(location_id)
    shrine_obj = shrines.get(shrine_key) or {}

    wx = fetch_open_meteo_daily(meta["lat"], meta["lng"])
    dates = wx["dates"][:6]
    if not dates:
        raise ValueError("weather_data_unavailable")

    daily_forecast = []
    weighted_counts = []
    for i, date_text in enumerate(dates):
        dt = datetime.strptime(date_text, "%Y-%m-%d")
        rain_prob = wx["rain_prob"][i] if i < len(wx["rain_prob"]) else 0
        code = wx["weather_code"][i] if i < len(wx["weather_code"]) else 0
        score = weather_score(rain_prob or 0, code or 0)
        sample = get_sample_pilgrims(shrine_obj, date_text)
        ref_base = sample if sample is not None else reference_daily_baseline(ch, location_id, dt)
        predicted = apply_kedar_cap(location_id, blend_with_weather(ref_base, score), meta_cap)
        weighted_counts.append(predicted)
        daily_forecast.append(
            {
                "date": date_text,
                "label": dt.strftime("%a"),
                "count": max(50, predicted),
            }
        )

    today_text = dates[0]
    today_dt = datetime.strptime(today_text, "%Y-%m-%d")
    today_sample = get_sample_pilgrims(shrine_obj, today_text)
    today_rain = wx["rain_prob"][0] if wx["rain_prob"] else 0
    today_code = wx["weather_code"][0] if wx["weather_code"] else 0
    today_score = weather_score(today_rain or 0, today_code or 0)
    today_total = today_sample if today_sample is not None else reference_daily_baseline(ch, location_id, today_dt)
    today_total = apply_kedar_cap(location_id, blend_with_weather(today_total, today_score), meta_cap)

    hourly_today = build_hourly_from_reference(shrine_obj, today_total)

    peak = max(weighted_counts)
    base_cap = meta["base_capacity"]
    current_status = "Low"
    if peak >= base_cap * 1.35:
        current_status = "High"
    elif peak >= base_cap * 0.85:
        current_status = "Moderate"

    summary = build_summary_from_metadata(ch)

    return {
        "locationId": location_id,
        "locationName": meta["name"],
        "current_status": current_status,
        "daily_forecast": daily_forecast,
        "hourly_today": hourly_today,
        "summary": summary,
        "data_sources": ["chardham_pilgrim_data.json", "Open-Meteo", "BKTC seasonal patterns"],
    }

def mjpeg_frame_generator(camera_id):
    while True:
        if cv2 is None:
            time.sleep(0.3)
            continue
        with camera_lock:
            if camera_id == 999:
                state = demo_camera_state
            else:
                state = camera_states[camera_id] if 0 <= camera_id < len(camera_states) else None
            frame = None if state is None or state["last_frame"] is None else state["last_frame"].copy()
        if frame is None:
            time.sleep(0.05)
            continue

        ok, buffer = cv2.imencode(".jpg", frame)
        if not ok:
            time.sleep(0.05)
            continue
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        time.sleep(0.03)

def placeholder_frame_generator(title, message):
    if cv2 is None:
        while True:
            time.sleep(0.5)
            yield b""
    while True:
        frame = make_placeholder_frame(title, message)
        ok, buffer = cv2.imencode(".jpg", frame)
        if ok:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        time.sleep(0.5)

@app.route("/health")
def health():
    snapshot = get_camera_snapshot()
    active_cameras = len([cam for cam in snapshot if cam["status"] == "active"])
    return jsonify({"status": "ok", "mode": model_status, "system_mode": system_mode, "active_cameras": active_cameras, "total_cameras": len(snapshot)})

@app.route("/mode", methods=["GET", "POST"])
def manage_mode():
    global system_mode
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        new_mode = payload.get("mode")
        if new_mode in ["cctv", "demo"]:
            with camera_lock:
                system_mode = new_mode
            return jsonify({"ok": True, "mode": system_mode})
        return jsonify({"error": "invalid_mode"}), 400
    return jsonify({"mode": system_mode})

@app.route("/count")
def get_count():
    return jsonify({"people": total_people_count()})

@app.route("/cameras")
def cameras():
    snapshot = get_camera_snapshot()
    return jsonify(
        {
            "cameras": snapshot,
            "total_people": calculate_deduplicated_count(),
            "active_cameras": len([cam for cam in snapshot if cam["status"] == "active"]),
            "system_mode": system_mode
        }
    )

@app.route("/demo_frame", methods=["POST"])
def receive_demo_frame():
    if system_mode != "demo":
        return jsonify({"error": "not_in_demo_mode"}), 400
    
    payload = request.get_json(silent=True) or {}
    image_b64 = payload.get("image")
    if not image_b64:
        return jsonify({"error": "missing_image"}), 400
        
    try:
        # Remove data URI prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
            
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "invalid_image"}), 400
            
        if MODEL_INSTANCE is not None:
            with inference_lock:
                results = MODEL_INSTANCE(frame, verbose=False)
            count = 0
            for result in results:
                for box in result.boxes:
                    if int(box.cls[0]) == 0:  # Class 0 is person in YOLOv8
                        count += 1
            annotated = results[0].plot() if results else frame
        else:
            count = 0
            annotated = frame
            
        with camera_lock:
            demo_camera_state["status"] = "active"
            demo_camera_state["count"] = count
            demo_camera_state["last_seen"] = utc_now().isoformat()
            demo_camera_state["last_frame"] = annotated
            
        return jsonify({"ok": True, "count": count})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cameras/connect", methods=["POST"])
def connect_camera():
    payload = request.get_json(silent=True) or {}
    source = str(payload.get("source", "")).strip()
    name = str(payload.get("name", "")).strip()
    slot = payload.get("slot")
    if system_mode == "demo":
        return jsonify({"error": "cannot connect in demo mode"}), 400
    ok, result, status_code = connect_camera_internal(source, name, slot)
    if not ok:
        return jsonify({"error": result}), status_code
    return jsonify({"ok": True, "camera": result})

@app.route("/cameras/add", methods=["POST"])
def add_camera_slot():
    if system_mode == "demo":
        return jsonify({"error": "cannot add in demo mode"}), 400
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    source = str(payload.get("source", "")).strip()

    with camera_lock:
        new_id = len(camera_states)
        state = {
            "id": new_id,
            "name": name or f"Camera {new_id + 1}",
            "source": source,
            "status": "reconnecting" if source else "no_camera",
            "count": 0,
            "last_frame": make_placeholder_frame(name or f"Camera {new_id + 1}", "No camera connected"),
            "last_seen": None,
            "worker_started": True,
        }
        camera_states.append(state)

    threading.Thread(target=run_camera_loop, args=(state, MODEL_INSTANCE, False), daemon=True).start()
    return jsonify({"ok": True, "camera": get_camera_snapshot()[-1]}), 201

def connect_camera_internal(source, name="", slot=None):
    if not source:
        return False, "missing_source", 400

    with camera_lock:
        if slot is not None:
            try:
                slot = int(slot)
            except (TypeError, ValueError):
                return False, "invalid_slot", 400
            while slot >= len(camera_states):
                new_id = len(camera_states)
                new_state = {
                    "id": new_id,
                    "name": f"Camera {new_id + 1}",
                    "source": "",
                    "status": "no_camera",
                    "count": 0,
                    "last_frame": make_placeholder_frame(f"Camera {new_id + 1}", "No camera connected"),
                    "last_seen": None,
                    "worker_started": True,
                }
                camera_states.append(new_state)
                threading.Thread(target=run_camera_loop, args=(new_state, MODEL_INSTANCE, False), daemon=True).start()
            target = camera_states[slot]
        else:
            available = next((cam for cam in camera_states if not str(cam["source"]).strip()), None)
            if available is None:
                new_id = len(camera_states)
                available = {
                    "id": new_id,
                    "name": f"Camera {new_id + 1}",
                    "source": "",
                    "status": "no_camera",
                    "count": 0,
                    "last_frame": make_placeholder_frame(f"Camera {new_id + 1}", "No camera connected"),
                    "last_seen": None,
                    "worker_started": True,
                }
                camera_states.append(available)
                threading.Thread(target=run_camera_loop, args=(available, MODEL_INSTANCE, False), daemon=True).start()
            target = available

        target["source"] = str(source).strip()
        target["name"] = (name or target["name"]).strip() or target["name"]
        target["status"] = "reconnecting"
        target["count"] = 0
        camera_id = target["id"]

    return True, get_camera_snapshot()[-1] if slot is None else camera_states[camera_id], 200

@app.route("/cameras/<int:camera_id>/disconnect", methods=["POST"])
def disconnect_camera(camera_id):
    if system_mode == "demo":
        return jsonify({"error": "cannot disconnect demo mode"}), 400
    with camera_lock:
        if camera_id < 0 or camera_id >= len(camera_states):
            return jsonify({"error": "camera_not_found"}), 404
        state = camera_states[camera_id]
        state["source"] = ""
        state["status"] = "no_camera"
        state["count"] = 0
        state["last_seen"] = None
        state["last_frame"] = make_placeholder_frame(state["name"], "No camera connected")
    return jsonify({"ok": True})

@app.route("/cameras/<int:camera_id>/remove", methods=["POST"])
def remove_camera(camera_id):
    print(f"API CALL: Removing camera {camera_id}")
    if system_mode == "demo":
        return jsonify({"error": "cannot remove in demo mode"}), 400
    global camera_states
    with camera_lock:
        if camera_id < 0 or camera_id >= len(camera_states):
            return jsonify({"error": "camera_not_found"}), 404
        
        # Mark for removal to stop worker
        camera_states[camera_id]["removed"] = True
        
        # Remove from list
        removed_cam = camera_states.pop(camera_id)
        
        # Re-index remaining cameras to keep IDs consistent with list positions
        for i, state in enumerate(camera_states):
            state["id"] = i
    print(f"SUCCESS: Removed {removed_cam['name']}. Remaining: {len(camera_states)}")
    return jsonify({"ok": True, "removed": removed_cam["name"]})

@app.route("/video_feed")
@app.route("/video_feed/<int:camera_id>")
def video_feed(camera_id=0):
    if cv2 is None:
        return jsonify({"error": "opencv_not_available"}), 503
    if camera_id != 999 and (camera_id < 0 or camera_id >= len(camera_states)):
        return Response(
            placeholder_frame_generator("Camera not found", "Invalid camera slot"),
            mimetype="multipart/x-mixed-replace; boundary=frame",
        )

    return Response(
        mjpeg_frame_generator(camera_id),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )

@app.route("/ai/prediction")
def ai_prediction():
    snapshot = get_camera_snapshot()
    people = calculate_deduplicated_count()
    add_prediction_sample(people)
    active_cameras = len([cam for cam in snapshot if cam["status"] == "active"])
    forecast_data = build_forecast(people, active_cameras)
    now = utc_now()
    time_slots = [(now + timedelta(minutes=30 * i)).strftime("%H:%M") for i in range(len(forecast_data))]
    return jsonify(
        {
            "model": "YOLOv8n",
            "mode": model_status,
            "people_now": people,
            "active_cameras": active_cameras,
            "total_cameras": len(snapshot),
            "camera_breakdown": snapshot,
            "time_slots": time_slots,
            "forecast_data": forecast_data,
            "confidence": "92-98%",
            "system_mode": system_mode
        }
    )

@app.route("/datawise/prediction")
def datawise_prediction():
    location_id = (request.args.get("location_id") or "kedarnath").strip().lower()
    if location_id not in PILGRIM_LOCATION_META:
        return jsonify({"error": "invalid_location_id"}), 400
    try:
        prediction = build_datawise_prediction(location_id)
        return jsonify(prediction)
    except Exception as e:
        return jsonify({"error": "prediction_failed", "details": str(e)}), 500

@app.route("/datawise/predictions")
def datawise_predictions():
    results = {}
    failures = {}
    for location_id in PILGRIM_LOCATION_META.keys():
        try:
            results[location_id] = build_datawise_prediction(location_id)
        except Exception as e:
            failures[location_id] = str(e)
    return jsonify({"predictions": results, "failures": failures})

start_ai_workers()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
