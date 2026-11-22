"""Slide 1 and Slide 2 builders for JalDrishti ASTRA 2026 presentation."""
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

def build_slide_1(prs):
    """Slide 1: Title and Overview."""
    slide = create_base_slide(prs, "ASTRA 2026  •  TECHNICAL PRESENTATION", "", 1)
    
    # Left Hero Text
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(6.2), Inches(1.8))
    tf = title_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p = tf.paragraphs[0]
    p.text = "JalDrishti"
    p.font.name = FONT_TITLE
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    
    p2 = tf.add_paragraph()
    p2.text = "Satellite-to-Last-Mile Flood Intelligence"
    p2.font.name = FONT_TITLE
    p2.font.size = Pt(20)
    p2.font.bold = True
    p2.font.color.rgb = ACCENT_GOLD
    p2.space_before = Pt(8)

    desc_box = slide.shapes.add_textbox(Inches(0.8), Inches(3.1), Inches(6.0), Inches(1.4))
    tf_d = desc_box.text_frame
    tf_d.word_wrap = True
    tf_d.margin_left = tf_d.margin_top = tf_d.margin_right = tf_d.margin_bottom = 0
    pd = tf_d.paragraphs[0]
    pd.text = ("Rapid Synthetic Aperture Radar (SAR) flood delineation, population "
               "exposure analytics, road network severance routing, and zero-connectivity "
               "offline emergency beaconing for disaster response.")
    pd.font.name = FONT_BODY
    pd.font.size = Pt(14)
    pd.font.color.rgb = TEXT_MUTED

    # Domains & Tech pills
    domains = ["Earth Observation (SAR)", "Deep Learning U-Net", "NetworkX Routing", "Offline PWA"]
    left_offset = Inches(0.8)
    for dom in domains:
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_offset, Inches(4.7), Inches(1.45), Inches(0.32))
        pill.fill.solid()
        pill.fill.fore_color.rgb = CARD_BG
        pill.line.color.rgb = CARD_BORDER
        pill.adjustments[0] = 0.3
        ptf = pill.text_frame
        ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
        pp = ptf.paragraphs[0]
        pp.text = dom
        pp.alignment = PP_ALIGN.CENTER
        pp.font.name = FONT_BODY
        pp.font.size = Pt(9.5)
        pp.font.bold = True
        pp.font.color.rgb = ICE_BLUE
        left_offset += Inches(1.52)

    # Team Card
    add_card(slide, Inches(0.8), Inches(5.35), Inches(6.0), Inches(1.4))
    team_box = slide.shapes.add_textbox(Inches(1.0), Inches(5.45), Inches(5.6), Inches(1.2))
    ttf = team_box.text_frame
    ttf.word_wrap = True
    ttf.margin_left = ttf.margin_top = ttf.margin_right = ttf.margin_bottom = 0
    tp1 = ttf.paragraphs[0]
    tp1.text = "TEAM: [TEAM NAME]  |  VIT BHOPAL UNIVERSITY"
    tp1.font.name = FONT_BODY
    tp1.font.size = Pt(11)
    tp1.font.bold = True
    tp1.font.color.rgb = ACCENT_GOLD
    
    tp2 = ttf.add_paragraph()
    tp2.text = "Members: [MEMBER 1]  •  [MEMBER 2]  •  [MEMBER 3]  •  [MEMBER 4]"
    tp2.font.name = FONT_BODY
    tp2.font.size = Pt(11)
    tp2.font.color.rgb = TEXT_WHITE
    tp2.space_before = Pt(4)

    tp3 = ttf.add_paragraph()
    tp3.text = "Track: Space Technology & Disaster Management | ANTERiX Club"
    tp3.font.name = FONT_BODY
    tp3.font.size = Pt(10)
    tp3.font.color.rgb = TEXT_MUTED
    tp3.space_before = Pt(4)

    # Right Frame: Real Screenshot
    img_path = "docs/presentation/assets/command_center_main.png"
    if os.path.exists(img_path):
        add_card(slide, Inches(7.1), Inches(1.2), Inches(5.45), Inches(5.55), fill_color=CARD_BG, border_color=CARD_BORDER)
        slide.shapes.add_picture(img_path, Inches(7.2), Inches(1.3), Inches(5.25), Inches(5.35))

    add_speaker_notes(slide, {
        "timing": "1 min (0:00 - 1:00)",
        "points": "Introduce JalDrishti as a complete satellite-to-last-mile flood response platform. State the core innovation: bridging high-altitude space radar directly to ground-level rescue logistics.",
        "numbers": "1 operational prototype, 4 core subsystems: SAR sensor intake, deep learning segmentation, road network routing, offline PWA beacons.",
        "caveat": "Developed and validated on the historic 2022 Cachar/Silchar, Assam flood event.",
        "question": "What is the single biggest operational gap your platform addresses?",
        "answer": "The lag between satellite pass and rescue action. Optical satellites are blocked by monsoon clouds, and raw radar maps lack road reachability and offline communication for field teams."
    })
def build_slide_2(prs):
    """Slide 2: Problem Statement and Stakeholders."""
    slide = create_base_slide(
        prs,
        "02 / THE CHALLENGE",
        "The Disaster Blindspot: Cloud Cover and Inundated Ground Logistics",
        2
    )
    
    # Left Column: Problem & Personas
    # Card 1: Core Problem & SAR Rationale
    add_card(slide, Inches(0.8), Inches(1.58), Inches(6.0), Inches(2.15))
    p_box = slide.shapes.add_textbox(Inches(1.0), Inches(1.68), Inches(5.6), Inches(1.95))
    ptf = p_box.text_frame
    ptf.word_wrap = True
    ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
    
    p1 = ptf.paragraphs[0]
    p1.text = "WHY SPACE? SYNTHETIC APERTURE RADAR (SAR)"
    p1.font.name = FONT_BODY
    p1.font.size = Pt(11)
    p1.font.bold = True
    p1.font.color.rgb = ACCENT_GOLD

    p2 = ptf.add_paragraph()
    p2.text = ("During peak flood events, optical satellites (Sentinel-2, Landsat) suffer "
               "near 100% cloud obstruction. Sentinel-1 C-band SAR (5.405 GHz) transmits active "
               "microwave pulses that penetrate torrential clouds, rain, and darkness to capture ground specular reflectance.")
    p2.font.name = FONT_BODY
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(4)

    # Card 2: Three User Personas
    add_card(slide, Inches(0.8), Inches(3.9), Inches(6.0), Inches(2.9))
    u_box = slide.shapes.add_textbox(Inches(1.0), Inches(4.0), Inches(5.6), Inches(2.7))
    utf = u_box.text_frame
    utf.word_wrap = True
    utf.margin_left = utf.margin_top = utf.margin_right = utf.margin_bottom = 0

    up0 = utf.paragraphs[0]
    up0.text = "CRITICAL RESCUE STAKEHOLDERS"
    up0.font.name = FONT_BODY
    up0.font.size = Pt(11)
    up0.font.bold = True
    up0.font.color.rgb = ACCENT_GOLD

    personas = [
        ("DDMO (District Disaster Management):", " Needs rapid macro inundation bounds & population exposure figures to dispatch boats, NDRF units, and air-drop relief."),
        ("SDRF & NDRF Rescue Teams:", " Face submerged road networks and debris; require verified passable navigation corridors into isolated hamlets."),
        ("Stranded Hamlet Residents:", " Trapped by rising floodwaters with cellular towers down; need zero-network beacon signaling and local recession outlooks.")
    ]
    for role, desc in personas:
        p = utf.add_paragraph()
        p.space_before = Pt(5)
        r1 = p.add_run()
        r1.text = role
        r1.font.name = FONT_BODY
        r1.font.size = Pt(11.5)
        r1.font.bold = True
        r1.font.color.rgb = ICE_BLUE
        r2 = p.add_run()
        r2.text = desc
        r2.font.name = FONT_BODY
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    # Right Column: Big Numbers & Visual Schematic
    # Card 3: Quantitative Scale
    add_card(slide, Inches(7.1), Inches(1.58), Inches(5.45), Inches(2.15))
    stat_box = slide.shapes.add_textbox(Inches(7.3), Inches(1.68), Inches(5.1), Inches(1.95))
    stf = stat_box.text_frame
    stf.word_wrap = True
    stf.margin_left = stf.margin_top = stf.margin_right = stf.margin_bottom = 0

    sp0 = stf.paragraphs[0]
    sp0.text = "GROUND REALITY & SCALE (ASSAM 2022)"
    sp0.font.name = FONT_BODY
    sp0.font.size = Pt(11)
    sp0.font.bold = True
    sp0.font.color.rgb = ACCENT_GOLD

    sp1 = stf.add_paragraph()
    sp1.text = "~5.6 Million Affected  (32 of 35 Districts)"
    sp1.font.name = FONT_TITLE
    sp1.font.size = Pt(20)
    sp1.font.bold = True
    sp1.font.color.rgb = TEXT_WHITE
    sp1.space_before = Pt(4)

    sp2 = stf.add_paragraph()
    sp2.text = "Cachar Study Window: 427,338 Population  •  196.35 km Roads Cut"
    sp2.font.name = FONT_BODY
    sp2.font.size = Pt(12)
    sp2.font.bold = True
    sp2.font.color.rgb = ICE_BLUE
    sp2.space_before = Pt(4)

    sp3 = stf.add_paragraph()
    sp3.text = "*Source: IFRC DREF Operation Update MDRIN041 (Assam Monsoon Floods); Population MODELLED (WorldPop 2020)."
    sp3.font.name = FONT_BODY
    sp3.font.size = Pt(8.5)
    sp3.font.color.rgb = TEXT_DIM
    sp3.space_before = Pt(6)

    # Card 4: Radar Schematic Image
    img_path = "docs/presentation/assets/landing_radar_schematic.png"
    if os.path.exists(img_path):
        add_card(slide, Inches(7.1), Inches(3.9), Inches(5.45), Inches(2.9), fill_color=CARD_BG, border_color=CARD_BORDER)
        slide.shapes.add_picture(img_path, Inches(7.2), Inches(4.0), Inches(5.25), Inches(2.7))

    add_speaker_notes(slide, {
        "timing": "1 min (1:00 - 2:00)",
        "points": "Frame the dual challenge: satellite sensing blindspots and ground logistical collapse. Explain why optical imagery fails and why SAR is mandatory for flood disasters.",
        "numbers": "~5.6 million people affected across 32 of 35 Assam districts in 2022. 427,338 residents in Cachar study window, 196.35 km of roads cut.",
        "caveat": "5.6M is the official state-wide figure reported by IFRC; 427,338 is the modelled population in our 92.6-93.0E, 24.65-25.0N study window.",
        "question": "Why can't NDRF use optical satellites like Sentinel-2 or drones during the event?",
        "answer": "Optical sensors cannot see through the continuous 90%+ cloud cover of the monsoon. Drones have limited 5-10 km range and cannot fly safely in heavy storm conditions."
    })
