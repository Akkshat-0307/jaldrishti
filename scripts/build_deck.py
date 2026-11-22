"""Master script to generate JalDrishti ASTRA 2026 presentation deck."""
import os
import sys

# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pptx import Presentation
from scripts.presentation_helpers import SLIDE_WIDTH, SLIDE_HEIGHT
from scripts.slides_1_to_2 import build_slide_1, build_slide_2
from scripts.slides_3_to_4 import build_slide_3, build_slide_4
from scripts.slides_5_to_6 import build_slide_5, build_slide_6
from scripts.slides_7_to_8 import build_slide_7, build_slide_8

def main():
    print("Building JalDrishti ASTRA 2026 Presentation Deck...")
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT

    # Build all 8 slides
    build_slide_1(prs)
    print("✓ Slide 1: Title & Overview built.")
    
    build_slide_2(prs)
    print("✓ Slide 2: Problem & Personas built.")
    
    build_slide_3(prs)
    print("✓ Slide 3: Research & India-First Roadmap built.")
    
    build_slide_4(prs)
    print("✓ Slide 4: Solution (Sense, Assess, Act, Reach) built.")
    
    build_slide_5(prs)
    print("✓ Slide 5: System Architecture & Zero-Network built.")
    
    build_slide_6(prs)
    print("✓ Slide 6: Sen1Floods11 Benchmarks & Cachar Results built.")
    
    build_slide_7(prs)
    print("✓ Slide 7: Working Prototype & Live Demo Guide built.")
    
    build_slide_8(prs)
    print("✓ Slide 8: Impact, Economics & Scalability built.")

    out_dir = "docs/presentation"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "JalDrishti_ASTRA2026.pptx")
    prs.save(out_path)
    
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"\nSuccessfully generated {out_path} ({len(prs.slides)} slides, {size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
