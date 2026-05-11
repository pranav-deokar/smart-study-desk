import cv2
import mediapipe as mp
import numpy as np
from typing import Optional, Tuple
import math


mp_pose = mp.solutions.pose

LANDMARK = mp_pose.PoseLandmark


def calculate_angle(a: list, b: list, c: list) -> float:
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cosine = np.clip(cosine, -1.0, 1.0)
    return math.degrees(math.acos(cosine))


def analyze_posture(image_bytes: bytes, bad_posture_threshold: float = 160.0) -> dict:
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return {
            "posture": "unknown",
            "neck_angle": None,
            "shoulder_angle": None,
            "confidence": 0.0,
            "warning": False,
            "message": "Could not decode image"
        }

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5
    ) as pose:
        results = pose.process(rgb)

    if not results.pose_landmarks:
        return {
            "posture": "unknown",
            "neck_angle": None,
            "shoulder_angle": None,
            "confidence": 0.3,
            "warning": False,
            "message": "No person detected in frame"
        }

    lm = results.pose_landmarks.landmark
    h, w, _ = frame.shape

    def get_point(landmark) -> list:
        pt = lm[landmark]
        return [pt.x * w, pt.y * h]

    nose = get_point(LANDMARK.NOSE)
    left_shoulder = get_point(LANDMARK.LEFT_SHOULDER)
    right_shoulder = get_point(LANDMARK.RIGHT_SHOULDER)
    left_hip = get_point(LANDMARK.LEFT_HIP)
    right_hip = get_point(LANDMARK.RIGHT_HIP)
    left_ear = get_point(LANDMARK.LEFT_EAR)
    right_ear = get_point(LANDMARK.RIGHT_EAR)

    mid_shoulder = [(left_shoulder[0] + right_shoulder[0]) / 2,
                    (left_shoulder[1] + right_shoulder[1]) / 2]
    mid_hip = [(left_hip[0] + right_hip[0]) / 2,
               (left_hip[1] + right_hip[1]) / 2]
    mid_ear = [(left_ear[0] + right_ear[0]) / 2,
               (left_ear[1] + right_ear[1]) / 2]

    neck_angle = calculate_angle(mid_ear, mid_shoulder, mid_hip)
    shoulder_angle = calculate_angle(left_shoulder, mid_shoulder, right_shoulder)

    visibility_scores = [
        lm[LANDMARK.NOSE].visibility,
        lm[LANDMARK.LEFT_SHOULDER].visibility,
        lm[LANDMARK.RIGHT_SHOULDER].visibility,
        lm[LANDMARK.LEFT_HIP].visibility,
        lm[LANDMARK.RIGHT_HIP].visibility,
    ]
    confidence = float(np.mean(visibility_scores))

    is_bad_posture = neck_angle < bad_posture_threshold

    if is_bad_posture:
        deviation = bad_posture_threshold - neck_angle
        if deviation > 30:
            severity_msg = "Severely poor posture detected — straighten your back immediately!"
        elif deviation > 15:
            severity_msg = "Poor posture detected — please sit upright."
        else:
            severity_msg = "Slight forward lean detected — adjust your posture."
        posture_label = "bad"
        warning = True
    else:
        severity_msg = "Good posture — keep it up!"
        posture_label = "good"
        warning = False

    return {
        "posture": posture_label,
        "neck_angle": round(neck_angle, 2),
        "shoulder_angle": round(shoulder_angle, 2),
        "confidence": round(confidence, 3),
        "warning": warning,
        "message": severity_msg
    }
