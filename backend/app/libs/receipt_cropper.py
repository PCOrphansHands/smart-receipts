"""Automatic receipt cropping using OpenCV.

Detects the receipt in a photo and crops/perspective-corrects it,
producing a clean top-down image suitable for OCR and AI extraction.
"""

import cv2
import numpy as np
from io import BytesIO
from PIL import Image


def order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 points as: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]   # bottom-right has largest sum
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest difference
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest difference
    return rect


def perspective_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Apply perspective transform to get a top-down view of the receipt."""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute width of the new image
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = max(int(width_a), int(width_b))

    # Compute height of the new image
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = max(int(height_a), int(height_b))

    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1]
    ], dtype="float32")

    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, matrix, (max_width, max_height))
    return warped


def find_receipt_contour(image: np.ndarray) -> np.ndarray | None:
    """Find the largest rectangular contour in the image (the receipt).

    Returns the 4-point contour if found, or None if no suitable rectangle detected.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    # Dilate edges to close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edged = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    # Sort by area, largest first
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    image_area = image.shape[0] * image.shape[1]

    for contour in contours[:10]:
        contour_area = cv2.contourArea(contour)

        # Skip contours that are too small (less than 10% of image)
        if contour_area < image_area * 0.10:
            continue

        # Skip contours that are almost the entire image (>95%) — already cropped
        if contour_area > image_area * 0.95:
            continue

        # Approximate the contour to a polygon
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

        # If it has 4 vertices, it's likely a receipt
        if len(approx) == 4:
            return approx.reshape(4, 2).astype("float32")

    return None


def crop_receipt(image_bytes: bytes) -> bytes | None:
    """Detect and crop the receipt from a photo.

    Args:
        image_bytes: Raw image bytes (JPEG/PNG)

    Returns:
        Cropped image as JPEG bytes, or None if no receipt detected
        (caller should use the original image as fallback)
    """
    try:
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            print("Receipt cropper: could not decode image")
            return None

        contour = find_receipt_contour(image)

        if contour is None:
            print("Receipt cropper: no receipt contour found, using original")
            return None

        # Apply perspective transform
        cropped = perspective_transform(image, contour)

        # Encode back to JPEG
        success, encoded = cv2.imencode('.jpg', cropped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not success:
            print("Receipt cropper: failed to encode cropped image")
            return None

        print(f"Receipt cropper: successfully cropped from {image.shape[:2]} to {cropped.shape[:2]}")
        return encoded.tobytes()

    except Exception as e:
        print(f"Receipt cropper: error during processing: {e}")
        return None
