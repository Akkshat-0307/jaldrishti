"""Slide 7 and Slide 8 builders for JalDrishti ASTRA 2026 presentation."""
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

def build_slide_7(prs):
    """Slide 7: Working Prototype and Live Demo Guide."""
    slide = create_base_slide(
        prs,
        "07 / WORKING PROTOTYPE",
        "Operational Prototype: Live Command Center and Offline PWA",
        7
    )

    # Left Container: Large Main Screenshot with Callouts
    left_w = Inches(7.4)
    add_card(slide, Inches(0.8), Inches(1.58), left_w, Inches(5.2))
    
    img_path = "docs/presentation/assets/command_center_main.png"
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, Inches(0.9), Inches(1.68), left_w - Inches(0.2), Inches(3.3))

    # Callout Strip below image
    c_box = slide.shapes.add_textbox(Inches(0.9), Inches(5.1), left_w - Inches(0.2), Inches(1.55))
    ctf = c_box.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0
    cp0 = ctf.paragraphs[0]
    cp0.text = "FOUR REAL-TIME OPERATIONAL CAPABILITIES:"
    cp0.font.name = FONT_BODY
    cp0.font.size = Pt(10)
    cp0.font.bold = True
    cp0.font.color.rgb = ACCENT_GOLD

    callouts = [
        ("1. Inundation Extent:", " 9,975.59 ha radar flood mask over self-hosted 2.5MB PMTiles vector basemap."),
        ("2. Cut-Off Settlements:", " Identifies 8 isolated zones (e.g. Masimpur 100% cut off) with population counts."),
        ("3. Evacuation Corridors:", " Real-time Dijkstra routing avoiding 196.35 km of submerged road segments."),
        ("4. Hydrological Outlook:", " Open-Meteo GloFAS river hydrographs with +0.5m what-if scenario simulations.")
    ]
    for c_title, c_desc in callouts:
        p = ctf.add_paragraph()
        p.space_before = Pt(2)
        r1 = p.add_run()
        r1.text = c_title
        r1.font.name = FONT_BODY
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = ICE_BLUE
        r2 = p.add_run()
        r2.text = c_desc
        r2.font.name = FONT_BODY
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_WHITE

    # Right Column Top: 5-Step Live Demo Checklist
    right_w = Inches(4.15)
    right_left = Inches(8.4)
    add_card(slide, right_left, Inches(1.58), right_w, Inches(2.65))
    d_box = slide.shapes.add_textbox(right_left + Inches(0.15), Inches(1.68), right_w - Inches(0.3), Inches(2.45))
    dtf = d_box.text_frame
    dtf.word_wrap = True
    dtf.margin_left = dtf.margin_top = dtf.margin_right = dtf.margin_bottom = 0

    dp0 = dtf.paragraphs[0]
    dp0.text = "5-STEP LIVE DEMO SEQUENCE"
    dp0.font.name = FONT_BODY
    dp0.font.size = Pt(11)
    dp0.font.bold = True
    dp0.font.color.rgb = ACCENT_GOLD

    demo_steps = [
        "1. Load Cachar Window: Inspect 9,976 ha flood boundary.",
        "2. Examine Zone 20 (Masimpur): 100% cut off, 2,828 exposed.",
        "3. Route Calculation: Solve safe path bypassing cut roads.",
        "4. Trigger Offline Beacon: Queue emergency beacon locally.",
        "5. What-If Simulation: Toggle +0.5m flood scenario layer."
    ]
    for step in demo_steps:
        p = dtf.add_paragraph()
        p.text = step
        p.font.name = FONT_BODY
        p.font.size = Pt(9.5)
        p.font.color.rgb = TEXT_WHITE
        p.space_before = Pt(3)

    # Right Column Bottom: Offline Beacon PWA + QR Code
    add_card(slide, right_left, Inches(4.35), right_w, Inches(2.43))
    
    # Phone screenshot thumbnail
    beacon_img = "docs/presentation/assets/beacon_mobile.png"
    if os.path.exists(beacon_img):
        slide.shapes.add_picture(beacon_img, right_left + Inches(0.15), Inches(4.45), Inches(1.15), Inches(2.25))

    # QR Code & Links box
    qr_img = "docs/presentation/assets/github_qr.png"
    if os.path.exists(qr_img):
        slide.shapes.add_picture(qr_img, right_left + Inches(1.4), Inches(4.5), Inches(1.2), Inches(1.2))

    link_box = slide.shapes.add_textbox(right_left + Inches(1.4), Inches(5.8), Inches(2.6), Inches(0.9))
    ltf = link_box.text_frame
    ltf.word_wrap = True
    ltf.margin_left = ltf.margin_top = ltf.margin_right = ltf.margin_bottom = 0

    lp0 = ltf.paragraphs[0]
    lp0.text = "LIVE DEPLOYMENT"
    lp0.font.name = FONT_BODY
    lp0.font.size = Pt(10)
    lp0.font.bold = True
    lp0.font.color.rgb = ACCENT_GOLD

    lp1 = ltf.add_paragraph()
    lp1.text = "URL: [LIVE URL]\nGitHub: Akkshatgoel/jaldrishti"
    lp1.font.name = FONT_BODY
    lp1.font.size = Pt(8.5)
    lp1.font.color.rgb = TEXT_WHITE
    lp1.space_before = Pt(2)

    add_speaker_notes(slide, {
        "timing": "1 min (6:00 - 7:00)",
        "points": "Guide the jury through the live operational prototype. Explain the 5 demo steps they will witness and draw attention to the mobile PWA beacon.",
        "numbers": "9,975.59 ha inundation, Zone 20 100% cut off (2,828 exposed), 196.35 km roads cut, 5-step demo workflow.",
        "caveat": "Demo runs in DEMO_MODE=1 ensuring 100% uptime with zero dependency on external network access or paid API keys.",
        "question": "Can this dashboard run on a low-spec field tablet or emergency vehicle laptop?",
        "answer": "Yes. The frontend runs in standard browser WebGL via MapLibre GL, and the entire static dataset is under 15 MB total, requiring minimal CPU and memory."
    })
def build_slide_8(prs):
    """Slide 8: Impact, Economics, Scalability, and Roadmap."""
    slide = create_base_slide(
        prs,
        "08 / IMPACT & ROADMAP",
        "Operational Impact, Scalability Economics, and the National Vision",
        8
    )

    columns = [
        {
            "title": "WHAT CHANGES FOR RESPONDERS",
            "color": ACCENT_GOLD,
            "items": [
                ("Predictive Staging:", "Moves emergency response from reactive guesswork to data-backed staging hours before floodwaters crest."),
                ("Traversable Route Certainty:", "Eliminates rescue boat and ambulance stranding on submerged highways (196.35 km cut mapped)."),
                ("Voice for the Invisible:", "Offline PWA beacons provide cut-off hamlets a direct channel to emergency coordinators."),
                ("Strict Provenance Badging:", "REAL, DERIVED, MODELLED, and SIMULATED badges prevent fatal operational misinformation.")
            ]
        },
        {
            "title": "SCALABILITY & ECONOMICS",
            "color": ICE_BLUE,
            "items": [
                ("Zero Proprietary License Costs:", "Built entirely on open-source stack (PyTorch, NetworkX, MapLibre, FastAPI); zero ESRI/Mapbox lock-in."),
                ("Ultra-Lightweight Footprint:", "Full district package is under 15 MB (2.5 MB PMTiles, 1.91 MB roads); runs on commodity laptops in the field."),
                ("National Replicability:", "Pipeline parametrisation allows seamless onboarding of any of India's 35 flood-prone river basins."),
                ("Sub-3-Minute Processing:", "Automated ingestion-to-routing pipeline completes in 165 seconds on standard 8-core CPU hardware.")
            ]
        },
        {
            "title": "HONEST LIMITS & FUTURE ROADMAP",
            "color": TEXT_WHITE,
            "items": [
                ("Constellation Fusion:", "6-12 day Sentinel-1 revisit requires fusing ISRO EOS-04 and upcoming NASA-ISRO NISAR L-band SAR."),
                ("Urban Canopy Penetration:", "Dense urban building corners create double-bounce radar artifacts requiring multi-angle SAR fusion."),
                ("NavIC Direct-to-Device:", "Porting offline beacons to Indian NavIC satellite messaging receivers for zero-cellular coverage areas."),
                ("State Command Integration:", "Direct automated webhook export to Assam State Disaster Management Authority (ASDMA) and NDMA.")
            ]
        }
    ]

    col_width = Inches(3.75)
    gap = Inches(0.25)
    left_start = Inches(0.8)
    top_pos = Inches(1.58)
    card_height = Inches(4.42)

    for i, col in enumerate(columns):
        col_left = left_start + i * (col_width + gap)
        add_card(slide, col_left, top_pos, col_width, card_height)

        box = slide.shapes.add_textbox(col_left + Inches(0.2), top_pos + Inches(0.2), col_width - Inches(0.4), card_height - Inches(0.4))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        h = tf.paragraphs[0]
        h.text = col["title"]
        h.font.name = FONT_BODY
        h.font.size = Pt(11)
        h.font.bold = True
        h.font.color.rgb = col["color"]

        for item_title, item_desc in col["items"]:
            p = tf.add_paragraph()
            p.space_before = Pt(6)
            r1 = p.add_run()
            r1.text = item_title + " "
            r1.font.name = FONT_BODY
            r1.font.size = Pt(10)
            r1.font.bold = True
            r1.font.color.rgb = col["color"]
            r2 = p.add_run()
            r2.text = item_desc
            r2.font.name = FONT_BODY
            r2.font.size = Pt(9.5)
            r2.font.color.rgb = TEXT_MUTED

    # Bottom Summary & Documentation Banner (No thank you slide!)
    add_card(slide, Inches(0.8), Inches(6.15), Inches(11.75), Inches(0.75))
    sum_box = slide.shapes.add_textbox(Inches(1.0), Inches(6.25), Inches(11.35), Inches(0.55))
    stf = sum_box.text_frame
    stf.word_wrap = True
    stf.margin_left = stf.margin_top = stf.margin_right = stf.margin_bottom = 0
    sp = stf.paragraphs[0]
    sp.text = "PROJECT REPOSITORY & DOCUMENTATION: https://github.com/Akkshatgoel/jaldrishti"
    sp.font.name = FONT_BODY
    sp.font.size = Pt(11)
    sp.font.bold = True
    sp.font.color.rgb = ACCENT_GOLD

    sp2 = stf.add_paragraph()
    sp2.text = "Full technical architecture, reproduction guide, model cards, QA bank, and offline test suite are open source and reproducible."
    sp2.font.name = FONT_BODY
    sp2.font.size = Pt(9)
    sp2.font.color.rgb = TEXT_MUTED
    sp2.space_before = Pt(2)

    add_speaker_notes(slide, {
        "timing": "1 min (7:00 - 8:00)",
        "points": "Synthesize the core impact: saving lives through actionable space intelligence. Explain economic scalability and summarize the national roadmap with ISRO EOS-04, NISAR, and NavIC.",
        "numbers": "Under 15 MB deployment size, sub-3-minute inference pipeline, 35 national river basins scalable.",
        "caveat": "Satellite pass latency requires multi-constellation fusion for sub-daily operational revisits.",
        "question": "What is the primary barrier to deploying this across all districts in India right now?",
        "answer": "Data ingestion pipelines for local river gauges and integrating directly with state emergency operating centers (SEOCs). The core compute and routing engine is already scalable to any district."
    })
