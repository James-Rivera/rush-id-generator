# Rush ID Generator

A modern, standards-compliant ID photo generator built with Next.js (App Router), Python (OpenCV, MediaPipe, rembg), and robust image processing logic for passport/ID photo requirements.

## Features
- Upload a photo and get a perfectly cropped, background-removed, and color-corrected 2x2 ID photo (600x600px @ 300dpi).
- Cropping and framing strictly follow passport/ID photo standards:
  - Head height (chin to top of hair): ~65% of image height
  - Top margin: ~8–15% of image height
  - Face is centered horizontally, slightly above vertical center (shows shoulders, avoids floating head)
- Uses MediaPipe for accurate face detection and landmarking (not just silhouette/mask).
- Handles color (BGR/RGB) and alpha (transparency) issues robustly.
- All binary transfers are safe and verifiable (SHA256).

## How the Pipeline Works

### 1. Upload & API
- User uploads a photo via the web UI or API (`/api/generate`).
- The API receives the image and saves it to a temp file.

### 2. Background Removal (rembg)
- The API calls the Python `rembg` tool to remove the background, producing a PNG with alpha channel.

### 3. Cropping & Framing (Python: `crop_rush_id.py`)
- The API calls the Python script `scripts/crop_rush_id.py` with the background-removed PNG.
- The script uses MediaPipe to detect the face bounding box and landmarks.
- It computes a square crop:
  - Crop size = 2.2 × face box width (tunable)
  - Crop is centered horizontally on the face, and shifted up (downShift=0.40) to show more shoulders and less top whitespace
  - The crop is clamped and re-centered to always include the face, even at image edges
  - After cropping, the script checks the head height in the crop and adjusts if needed to ensure it is ~65% of the image height
- The script composites any alpha onto white, resizes to 600x600, and saves the result as JPEG
- The script prints debug logs (face box, crop box, head height %, top margin %) and outputs a JSON with the output file path and SHA256

### 4. API Response
- The API reads the output file, verifies the SHA256, and returns the image as a binary response with correct headers (Content-Type, Content-Length, X-SHA256)

## Usage

### Web
- Start the Next.js server:
  ```sh
  npm run dev
  ```
- Open the web UI and upload a photo

### API (cURL)
- Upload and download a processed ID photo:
  ```sh
  curl -v -F "file=@test-input.jpg" -F "mode=standard" "http://localhost:3000/api/generate?raw=1" -o output.jpg
  ```
- Compare SHA256:
  ```sh
  Get-FileHash .\output.jpg -Algorithm SHA256
  ```

### Python Script (Debug/Standalone)
- Run the cropper directly and see debug logs:
  ```sh
  py -3 scripts/crop_rush_id.py test-input.jpg test-output.jpg --size 600
  ```

## Requirements
- Node.js, npm
- Python 3.x (with opencv-python, mediapipe, rembg, numpy)
- (Windows) Use `py -3` to run Python scripts if `python` is not in PATH

## Tuning
- Adjust `k` (crop multiplier) and `downShift` in `crop_rush_id.py` for different framing styles
- The pipeline is robust to edge cases and always keeps the face in the crop

## Debugging
- Debug logs are printed by the Python script to stdout (see terminal when running directly)
- For API calls, enable debug output in the server logs

---

**This system is designed for reliability, standards compliance, and easy tuning for any ID/passport photo requirements.**
