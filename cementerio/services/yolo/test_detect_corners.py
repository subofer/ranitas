import numpy as np
import cv2
from detect_corners import detect_document_corners_aggressive, detect_document_corners_opencv


def test_aggressive_finds_quad_even_with_missing_edges():
    # Create white image
    h, w = 800, 600
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    # Draw a large 'document' rectangle but cut one corner (simulate leaf with missing edge)
    pts = np.array([[50, 50], [w-60, 40], [w-20, h-60], [40, h-30]], dtype=np.int32)
    cv2.fillPoly(img, [pts], (0, 0, 0))

    # Remove a corner to simulate partial crop (erase a triangle)
    cv2.fillConvexPoly(img, np.array([[w-60,40],[w-20,40],[w-20,120]]), (255,255,255))

    res = detect_document_corners_aggressive(img)
    assert res is not None, "Aggressive fallback should find a quad"
    assert len(res) == 4, f"Expected 4 points, got {len(res)}"


def test_opencv_fallback_on_simple_rectangle():
    h, w = 400, 300
    img = np.ones((h, w, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (20, 20), (w-20, h-20), (0,0,0), -1)
    res = detect_document_corners_opencv(img)
    assert res is not None and len(res) == 4
