#!/usr/bin/env python3
"""
Crop rembg output into a standards-aligned 2x2 ID image.
Requirements (install):
  pip install opencv-python numpy
  pip install mediapipe   # optional but recommended

Usage:
  python scripts/crop_rush_id.py input.png output.jpg --size 600
"""
from typing import Tuple
import os
import sys
import argparse

import cv2
import numpy as np

# Try to import MediaPipe (optional)
try:
    import mediapipe as mp
    _HAS_MEDIAPIPE = True
    mp_face_mesh = mp.solutions.face_mesh
except Exception:
    _HAS_MEDIAPIPE = False


def _detect_with_haar(img_rgb: np.ndarray) -> Tuple[Tuple[int,int,int,int], Tuple[float,float]]:
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60,60))
    if len(faces) == 0:
        return None, None
    faces = sorted(faces, key=lambda r: r[2]*r[3], reverse=True)
    x,y,w,h = faces[0]
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    roi_gray = gray[y:y+h, x:x+w]
    eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(10,10))
    if len(eyes) >= 1:
        centers = []
        for (ex,ey,ew,eh) in eyes[:2]:
            centers.append((x + ex + ew/2.0, y + ey + eh/2.0))
        eye_center = (sum([c[0] for c in centers]) / len(centers),
                      sum([c[1] for c in centers]) / len(centers))
    else:
        eye_center = (x + w/2.0, y + h*0.35)
    return (x,y,w,h), eye_center


def _detect_with_mediapipe(img_rgb: np.ndarray):
    h, w, _ = img_rgb.shape
    with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True) as fmesh:
        res = fmesh.process(img_rgb)
    if not res.multi_face_landmarks:
        return None, None, None
    lm = res.multi_face_landmarks[0].landmark
    xs = np.array([p.x for p in lm])
    ys = np.array([p.y for p in lm])
    min_x, max_x = xs.min(), xs.max()
    min_y, max_y = ys.min(), ys.max()
    face_box = (int(min_x*w), int(min_y*h), int((max_x-min_x)*w), int((max_y-min_y)*h))
    left_eye_y = (lm[33].y + lm[133].y) / 2.0
    right_eye_y = (lm[362].y + lm[263].y) / 2.0
    left_eye_x = (lm[33].x + lm[133].x) / 2.0
    right_eye_x = (lm[362].x + lm[263].x) / 2.0
    eye_center = ((left_eye_x+right_eye_x)/2.0 * w, (left_eye_y+right_eye_y)/2.0 * h)
    chin_y = lm[152].y * h
    head_top = min_y * h
    return face_box, (float(eye_center[0]), float(eye_center[1])), (float(head_top), float(chin_y))


def _pad_image_to_fit(img: np.ndarray, left:int, top:int, right:int, bottom:int, fill_color=(255,255,255)):
    h, w = img.shape[:2]
    pad_left = max(0, -left)
    pad_top = max(0, -top)
    pad_right = max(0, right - w)
    pad_bottom = max(0, bottom - h)
    if pad_left == pad_top == pad_right == pad_bottom == 0:
        return img, (0,0)
    new_w = w + pad_left + pad_right
    new_h = h + pad_top + pad_bottom
    channels = img.shape[2] if img.ndim == 3 else 1
    if channels == 4:
        canvas = np.full((new_h, new_w, 4), 255, dtype=np.uint8)
    else:
        canvas = np.full((new_h, new_w, 3), 255, dtype=np.uint8)
    canvas[pad_top:pad_top+h, pad_left:pad_left+w] = img
    return canvas, (pad_left, pad_top)


def create_rush_id_from_rembg(input_path: str, output_path: str, size:int=600,
                              target_head_ratio:float=0.60, eye_percent_from_bottom:float=0.63,
                              hair_multiplier:float=1.4, preserve_alpha:bool=False):
    import hashlib, json, tempfile
    print(f"[DEBUG] Reading input: {input_path}")
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise FileNotFoundError(f"Can't read {input_path}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    has_alpha = img.shape[2] == 4 if img.ndim == 3 else False
    print(f"[DEBUG] Input shape: {img.shape}, dtype: {img.dtype}, has_alpha: {has_alpha}")
    # Always work in RGB for detection/cropping
    img_rgb = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2RGB)
    h_img, w_img = img_rgb.shape[:2]
    print(f"[DEBUG] RGB for detection: {img_rgb.shape}, dtype: {img_rgb.dtype}")

    # --- Face detection and square crop ---
    face_box = None
    eye_center = None
    if _HAS_MEDIAPIPE:
        try:
            fb, ec, hc = _detect_with_mediapipe(img_rgb)
            if fb is not None:
                face_box = fb
                eye_center = ec
        except Exception:
            face_box = None
    if face_box is None:
        face_box, eye_center = _detect_with_haar(img_rgb)
        if face_box is None:
            # fallback: content bbox
            mask = np.any(img_rgb < 250, axis=2)
            ys, xs = np.where(mask)
            if len(xs) == 0:
                # fallback: center crop
                cx, cy = w_img/2.0, h_img/2.0
                crop_size = int(min(h_img, w_img) * 0.8)
                left = int(cx - crop_size/2); top = int(cy - crop_size/2)
                right = left + crop_size; bottom = top + crop_size
                canvas, offset = _pad_image_to_fit(img, left, top, right, bottom)
                crop = canvas[offset[1]:offset[1]+crop_size, offset[0]:offset[0]+crop_size]
                print(f"[DEBUG] Fallback crop: {crop.shape}")
                out_bgr = cv2.cvtColor(crop[:, :, :3], cv2.COLOR_RGB2BGR)
                cv2.imwrite(output_path, out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
                return
            x0, x1 = xs.min(), xs.max()
            y0, y1 = ys.min(), ys.max()
            face_box = (int(x0), int(y0), int(x1-x0+1), int(y1-y0+1))
            eye_center = (x0 + (x1-x0+1)/2.0, y0 + (y1-y0+1)*0.35)
    # --- NEW LOGIC: Use MediaPipe face box, enforce head size/headroom, center face with downShift ---
    face_x, face_y, face_w, face_h = face_box
    # --- Robust, face-centered, square crop with ideal ID proportions ---
    # --- Tuned for ideal ID proportions ---
    k = 2.2  # Crop size multiplier (smaller = bigger face)
    downShift = 0.40  # More shift = face higher in frame
    h_img, w_img = img.shape[:2]
    crop_size_px = int(round(k * face_w))
    cx = face_x + face_w / 2.0
    cy = face_y + face_h / 2.0 + face_h * downShift
    # Initial ideal crop
    left = int(round(cx - crop_size_px / 2))
    top = int(round(cy - crop_size_px / 2))
    right = left + crop_size_px
    bottom = top + crop_size_px

    def clamp(val, minv, maxv):
        return max(minv, min(val, maxv))

    # Try to keep the crop centered on (cx, cy) as much as possible
    shift_x = 0
    shift_y = 0
    if left < 0:
        shift_x = -left
    if right > w_img:
        shift_x = w_img - right
    if top < 0:
        shift_y = -top
    if bottom > h_img:
        shift_y = h_img - bottom
    left = clamp(left + shift_x, 0, w_img - crop_size_px)
    right = left + crop_size_px
    top = clamp(top + shift_y, 0, h_img - crop_size_px)
    bottom = top + crop_size_px

    # If crop box is out of bounds, shrink to fit
    if right > w_img:
        right = w_img
        left = right - crop_size_px
    if bottom > h_img:
        bottom = h_img
        top = bottom - crop_size_px
    left = clamp(left, 0, w_img - 1)
    right = clamp(right, left + 1, w_img)
    top = clamp(top, 0, h_img - 1)
    bottom = clamp(bottom, top + 1, h_img)

    # If crop box is still not square or too small, fallback to center crop
    crop_w = right - left
    crop_h = bottom - top
    if crop_w != crop_h or crop_w <= 0 or crop_h <= 0:
        min_side = min(h_img, w_img)
        left = (w_img - min_side) // 2
        right = left + min_side
        top = (h_img - min_side) // 2
        bottom = top + min_side
        crop = img[top:bottom, left:right]
        print("[DEBUG] Fallback to center crop")
    else:
        crop = img[top:bottom, left:right]

    # --- Post-crop: adjust to ensure head height is ~65% of crop height ---
    # Estimate head height as face_h (from mediapipe box)
    head_height = face_h * (size / crop.shape[0])
    head_height_pct = head_height / size * 100.0
    target_pct = 65.0
    min_pct = 60.0
    max_pct = 70.0
    if head_height_pct < min_pct or head_height_pct > max_pct:
        # Re-crop with adjusted k
        k_new = k * (head_height_pct / target_pct)
        crop_size_px2 = int(round(k_new * face_w))
        left2 = int(round(cx - crop_size_px2 / 2))
        top2 = int(round(cy - crop_size_px2 / 2))
        right2 = left2 + crop_size_px2
        bottom2 = top2 + crop_size_px2
        left2 = clamp(left2, 0, w_img - 1)
        right2 = clamp(right2, left2 + 1, w_img)
        top2 = clamp(top2, 0, h_img - 1)
        bottom2 = clamp(bottom2, top2 + 1, h_img)
        crop = img[top2:bottom2, left2:right2]
        print(f"[DEBUG] Adjusted crop for head height: k={k_new:.2f}")
        head_height = face_h * (size / crop.shape[0])
        head_height_pct = head_height / size * 100.0

    top_margin_px = (face_y - top) * (size / crop.shape[0])
    top_margin_pct = top_margin_px / size * 100.0
    print(f"[DEBUG] faceBox: x={face_x}, y={face_y}, w={face_w}, h={face_h}")
    print(f"[DEBUG] cropBox: left={left}, top={top}, right={right}, bottom={bottom}, size={crop.shape[1]}x{crop.shape[0]}")
    print(f"[DEBUG] cropped shape: {crop.shape}, dtype: {crop.dtype}")
    print(f"[DEBUG] head height in crop: {head_height_pct:.1f}% (should be 65%)")
    print(f"[DEBUG] top margin in crop: {top_margin_pct:.1f}% (should be 8–15%)")

    # --- Alpha handling: composite RGBA onto white if alpha present ---
    if crop.shape[2] == 4:
        b, g, r, a = cv2.split(crop)
        alpha = a.astype('float32') / 255.0
        b = b.astype('float32')
        g = g.astype('float32')
        r = r.astype('float32')
        white = 255.0
        b_comp = (b * alpha + white * (1.0 - alpha)).astype('uint8')
        g_comp = (g * alpha + white * (1.0 - alpha)).astype('uint8')
        r_comp = (r * alpha + white * (1.0 - alpha)).astype('uint8')
        crop_rgb = cv2.merge([r_comp, g_comp, b_comp])  # RGB order
        print(f"[DEBUG] Alpha composited to white, shape: {crop_rgb.shape}")
    else:
        crop_rgb = cv2.cvtColor(crop[:, :, :3], cv2.COLOR_BGR2RGB)
        print(f"[DEBUG] No alpha, shape: {crop_rgb.shape}")
    # --- Resize to target size ---
    final = cv2.resize(crop_rgb, (size, size), interpolation=cv2.INTER_AREA)
    print(f"[DEBUG] Final resized shape: {final.shape}")
    # --- Write to temp file, compute SHA256, output JSON ---
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        out_bgr = cv2.cvtColor(final, cv2.COLOR_RGB2BGR)
        cv2.imwrite(tmp.name, out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        tmp.flush()
        with open(tmp.name, 'rb') as f:
            data = f.read()
            sha256 = hashlib.sha256(data).hexdigest()
            out_json = {
                "outPath": tmp.name,
                "sha256": sha256,
                "bytes": len(data)
            }
            print(json.dumps(out_json))
    # Also copy to output_path for legacy compatibility
    dirname = os.path.dirname(output_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    cv2.imwrite(output_path, out_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    print(f"[DEBUG] Output written: {output_path}")
    return


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('input')
    p.add_argument('output')
    p.add_argument('--size', type=int, default=600)
    p.add_argument('--preserve-alpha', action='store_true', help='Preserve alpha channel and output PNG')
    args = p.parse_args()
    create_rush_id_from_rembg(args.input, args.output, size=args.size, preserve_alpha=args.preserve_alpha)
