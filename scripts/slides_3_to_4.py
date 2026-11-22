"""Slide 3 and Slide 4 builders for JalDrishti ASTRA 2026 presentation."""
import os
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from scripts.presentation_helpers import (
    create_base_slide, add_card, add_badge, add_speaker_notes,
    FONT_TITLE, FONT_BODY, BG_NAVY, CARD_BG, CARD_BORDER, ACCENT_GOLD,
    ICE_BLUE, TEXT_WHITE, TEXT_MUTED, TEXT_DIM
)

def build_slide_3(prs):
    """Slide 3: Research, Data Foundation, and India-First Roadmap."""
    slide = create_base_slide(
        prs,
        "03 / RESEARCH & GAP ANALYSIS",
        "State of the Art: Radar Processing Gaps and the India-First Roadmap",
        3
    )

    # 3-Column Architecture
    col_width = Inches(3.75)
    gap = Inches(0.25)
    left_start = Inches(0.8)
    top_pos = Inches(1.58)
    card_height = Inches(5.2)

    # Column 1: Research Gap
    add_card(slide, left_start, top_pos, col_width, card_height)
    box1 = slide.shapes.add_textbox(left_start + Inches(0.2), top_pos + Inches(0.2), col_width - Inches(0.4), card_height - Inches(0.4))
    tf1 = box1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    h1 = tf1.paragraphs[0]
    h1.text = "EXISTING TOOLS VS JALDRISHTI"
    h1.font.name = FONT_BODY
    h1.font.size = Pt(11)
    h1.font.bold = True
    h1.font.color.rgb = ACCENT_GOLD

    gaps = [
        ("Traditional Otsu Thresholding:", " High false positives in urban shadow and rough water; achieves only 21.68% IoU on Sen1Floods11 benchmark."),
        ("JalDrishti Supervised U-Net:", " Trained on Sen1Floods11 dual-polarisation SAR; achieves 68.04% IoU (+213.8% improvement over Otsu)."),
        ("Static GIS Maps:", " Deliver 24-48 hr post-pass PDF maps with zero road traversability or evacuation guidance."),
        ("Dynamic Action Engine:", " Automates road severance analysis (196.35 km cut) and generates relief paths in under 3 minutes.")
    ]
    for title, desc in gaps:
        p = tf1.add_paragraph()
        p.space_before = Pt(6)
        r1 = p.add_run()
        r1.text = title
        r1.font.name = FONT_BODY
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = ICE_BLUE if "JalDrishti" in title or "Dynamic" in title else TEXT_WHITE
        r2 = p.add_run()
        r2.text = desc
        r2.font.name = FONT_BODY
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    # Column 2: Data Foundation & Sentinel-1 Scenes
    left_2 = left_start + col_width + gap
    add_card(slide, left_2, top_pos, col_width, card_height)
    box2 = slide.shapes.add_textbox(left_2 + Inches(0.2), top_pos + Inches(0.2), col_width - Inches(0.4), card_height - Inches(0.4))
    tf2 = box2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    h2 = tf2.paragraphs[0]
    h2.text = "MULTI-TEMPORAL SAR FOUNDATION"
    h2.font.name = FONT_BODY
    h2.font.size = Pt(11)
    h2.font.bold = True
    h2.font.color.rgb = ACCENT_GOLD

    scenes = [
        ("Pre-Flood Baseline (2022-05-01):", " Scene: S1A_..._043009_..._1E38\nVV/VH calibrated backscatter dry baseline; 0 ha inundated."),
        ("Flood Peak (2022-06-18):", " Scene: S1A_..._043709_..._E87E\n9,975.59 ha inundation; 101,986 exposed residents in Cachar."),
        ("Recession Phase (2022-06-30):", " Scene: S1A_..._043884_..._3654\n4,995 ha inundation; water retreating back to river bed."),
        ("Ancillary Geospatial Priors:", " Copernicus DEM GLO-30 (slope threshold <5°) + JRC Surface Water (>80% permanent water exclusion).")
    ]
    for s_title, s_desc in scenes:
        p = tf2.add_paragraph()
        p.space_before = Pt(6)
        r1 = p.add_run()
        r1.text = s_title
        r1.font.name = FONT_BODY
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = ICE_BLUE
        r2 = p.add_run()
        r2.text = s_desc
        r2.font.name = FONT_BODY
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    # Column 3: India-First Space Roadmap
    left_3 = left_2 + col_width + gap
    add_card(slide, left_3, top_pos, col_width, card_height)
    box3 = slide.shapes.add_textbox(left_3 + Inches(0.2), top_pos + Inches(0.2), col_width - Inches(0.4), card_height - Inches(0.4))
    tf3 = box3.text_frame
    tf3.word_wrap = True
    tf3.margin_left = tf3.margin_top = tf3.margin_right = tf3.margin_bottom = 0

    h3 = tf3.paragraphs[0]
    h3.text = "INDIA-FIRST SPACE INTEGRATION"
    h3.font.name = FONT_BODY
    h3.font.size = Pt(11)
    h3.font.bold = True
    h3.font.color.rgb = ACCENT_GOLD

    india_items = [
        ("ISRO EOS-04 (RISAT-1A):", " Indian C-band SAR operational pipeline target for indigenous high-repeat radar passes over flood plains."),
        ("Bhoonidhi & Bhuvan (NRSC):", " Direct API integration for rapid Indian remote sensing data retrieval and national flood layers."),
        ("MOSDAC & VEDAS (SAC):", " Ingesting hydrological models and meteorological real-time precipitation forecasts."),
        ("NavIC Satellite Broadcasts:", " Direct-to-handset emergency short-message broadcasting to stranded victims without cellular towers.")
    ]
    for ititle, idesc in india_items:
        p = tf3.add_paragraph()
        p.space_before = Pt(6)
        r1 = p.add_run()
        r1.text = ititle
        r1.font.name = FONT_BODY
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r1.font.color.rgb = ACCENT_GOLD
        r2 = p.add_run()
        r2.text = idesc
        r2.font.name = FONT_BODY
        r2.font.size = Pt(10)
        r2.font.color.rgb = TEXT_MUTED

    add_speaker_notes(slide, {
        "timing": "1 min (2:00 - 3:00)",
        "points": "Contrast existing slow GIS tools with JalDrishti. Present the 3 Sentinel-1 scenes used for Cachar. Introduce the India-first roadmap using ISRO EOS-04 and NavIC.",
        "numbers": "3 Sentinel-1 scenes (May 1, June 18, June 30, 2022). 68.04% U-Net IoU vs 21.68% Otsu. 9,975.59 ha peak inundation.",
        "caveat": "Currently operates on Sentinel-1; EOS-04 and Bhoonidhi APIs are architectural target integrations.",
        "question": "Can this run on Indian satellites instead of European Space Agency Sentinel-1?",
        "answer": "Yes. The pipeline is designed for C-band SAR backscatter. ISRO's EOS-04 (RISAT-1A) operates on C-band with identical specular physics and will plug directly into our ingestion worker."
    })
def build_slide_4(prs):
    """Slide 4: Solution Architecture (Sense, Assess, Act, Reach)."""
    slide = create_base_slide(
        prs,
        "04 / THE SOLUTION",
        "The JalDrishti Pipeline: Four Integrated Pillars from Orbit to Field",
        4
    )

    stages = [
        {
            "name": "1. SENSE",
            "subtitle": "SAR Orbit to Radar Mask",
            "desc": "Calibrates dual-pol (VV/VH) Sentinel-1 C-band SAR backscatter; applies Copernicus GLO-30 DEM slope masking & JRC permanent water exclusion.",
            "badges": ["REAL", "DERIVED"],
            "image": "docs/presentation/assets/command_center_main.png"
        },
        {
            "name": "2. ASSESS",
            "subtitle": "Segmentation & Isolation",
            "desc": "Lightweight U-Net generates 10m binary flood masks. Intersects with WorldPop 100m raster and identifies 8 cut-off zones (100,310 residents).",
            "badges": ["MODELLED", "DERIVED"],
            "image": "docs/presentation/assets/command_center_villages.png"
        },
        {
            "name": "3. ACT",
            "subtitle": "Safe Dispatch & Routing",
            "desc": "Overlays inundation buffers (50m) on OpenStreetMap roads. Computes least-risk relief corridors bypassing 196.35 km of submerged road segments.",
            "badges": ["DERIVED"],
            "image": "docs/presentation/assets/command_center_routes.png"
        },
        {
            "name": "4. REACH",
            "subtitle": "Offline Beacon & Alerts",
            "desc": "Zero-connectivity PWA queues emergency beacons locally in IndexedDB; dispatches CAP v1.2 JSON/SMS payloads when network reconnects.",
            "badges": ["SIMULATED"],
            "image": "docs/presentation/assets/beacon_mobile.png"
        }
    ]

    col_width = Inches(2.78)
    gap = Inches(0.18)
    left_start = Inches(0.8)
    top_pos = Inches(1.58)
    card_height = Inches(5.2)

    for i, stage in enumerate(stages):
        col_left = left_start + i * (col_width + gap)
        add_card(slide, col_left, top_pos, col_width, card_height)

        # Header Box
        hdr_box = slide.shapes.add_textbox(col_left + Inches(0.15), top_pos + Inches(0.15), col_width - Inches(0.3), Inches(0.65))
        htf = hdr_box.text_frame
        htf.word_wrap = True
        htf.margin_left = htf.margin_top = htf.margin_right = htf.margin_bottom = 0

        hp1 = htf.paragraphs[0]
        hp1.text = stage["name"]
        hp1.font.name = FONT_TITLE
        hp1.font.size = Pt(13)
        hp1.font.bold = True
        hp1.font.color.rgb = ACCENT_GOLD

        hp2 = htf.add_paragraph()
        hp2.text = stage["subtitle"]
        hp2.font.name = FONT_BODY
        hp2.font.size = Pt(9.5)
        hp2.font.color.rgb = ICE_BLUE

        # Image Frame
        img_path = stage["image"]
        if os.path.exists(img_path):
            img_card = add_card(slide, col_left + Inches(0.15), top_pos + Inches(0.85), col_width - Inches(0.3), Inches(1.85), fill_color=BG_NAVY, border_color=CARD_BORDER)
            slide.shapes.add_picture(img_path, col_left + Inches(0.18), top_pos + Inches(0.88), col_width - Inches(0.36), Inches(1.79))

        # Description
        desc_box = slide.shapes.add_textbox(col_left + Inches(0.15), top_pos + Inches(2.8), col_width - Inches(0.3), Inches(1.85))
        dtf = desc_box.text_frame
        dtf.word_wrap = True
        dtf.margin_left = dtf.margin_top = dtf.margin_right = dtf.margin_bottom = 0
        dp = dtf.paragraphs[0]
        dp.text = stage["desc"]
        dp.font.name = FONT_BODY
        dp.font.size = Pt(9.5)
        dp.font.color.rgb = TEXT_WHITE

        # Badges row
        b_left = col_left + Inches(0.15)
        for badge in stage["badges"]:
            add_badge(slide, b_left, top_pos + Inches(4.75), badge)
            b_left += Inches(1.02)

    add_speaker_notes(slide, {
        "timing": "1 min (3:00 - 4:00)",
        "points": "Walk through the four operational pillars: Sense, Assess, Act, Reach. Emphasize that each layer is explicitly badged to maintain strict transparency.",
        "numbers": "10m SAR resolution, 8 cut-off zones, 100,310 isolated residents, 196.35 km cut roads, 427,338 population.",
        "caveat": "Beacon PWA is functional offline; SMS transmission is simulated in demo mode via CAP v1.2 payloads.",
        "question": "How do you distinguish between real, modelled, and simulated components?",
        "answer": "We adhere to strict provenance: satellite radar and roads are REAL; population counts and deep learning masks are MODELLED/DERIVED; emergency beacons without active cellular are SIMULATED."
    })
