"""Helper utilities and constants for JalDrishti ASTRA 2026 presentation deck."""
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# 16:9 Widescreen dimensions
SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)

# ASTRA 2026 Color Palette
BG_NAVY = RGBColor(8, 14, 26)         # Deep Navy (#080E1A)
CARD_BG = RGBColor(15, 26, 46)        # Dark Navy Slate (#0F1A2E)
CARD_BORDER = RGBColor(30, 41, 59)    # Border Slate (#1E293B)
ACCENT_GOLD = RGBColor(245, 158, 11)  # Warm Gold (#F59E0B)
ICE_BLUE = RGBColor(56, 189, 248)     # Cyan/Ice Blue (#38BDF8)
TEXT_WHITE = RGBColor(248, 250, 252)  # Bright White (#F8FAFC)
TEXT_MUTED = RGBColor(148, 163, 184)  # Slate Gray (#94A3B8)
TEXT_DIM = RGBColor(100, 116, 139)    # Dim Gray (#64748B)

# Badge colors
BADGE_COLORS = {
    "REAL": (RGBColor(16, 185, 129), RGBColor(6, 78, 59)),       # Emerald
    "DERIVED": (RGBColor(14, 165, 233), RGBColor(12, 74, 110)),   # Sky Blue
    "MODELLED": (RGBColor(168, 85, 247), RGBColor(88, 28, 135)),  # Purple
    "SIMULATED": (RGBColor(245, 158, 11), RGBColor(120, 53, 15))  # Amber
}

FONT_TITLE = "Arial"
FONT_BODY = "Calibri"
def create_base_slide(prs, section_str, title_str, slide_num, total_slides=8):
    """Creates a slide with deep navy background, gold section tag, title, and footer."""
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)
    
    # Set background color
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = BG_NAVY
    
    # Top Section Label (Gold small caps)
    if section_str:
        sec_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(10), Inches(0.3))
        tf = sec_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = section_str.upper()
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = ACCENT_GOLD
        
    # Main Slide Title (Arial Bold, sentence case)
    if title_str:
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.78), Inches(11.8), Inches(0.65))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_str
        p.font.name = FONT_TITLE
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE

    # Footer (Left: Team / Event / College, Right: Slide Num)
    footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(9.0), Inches(0.3))
    tf = footer_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "ASTRA 2026  •  [TEAM NAME]  •  VIT BHOPAL UNIVERSITY"
    p.font.name = FONT_BODY
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_MUTED

    num_box = slide.shapes.add_textbox(Inches(11.5), Inches(7.05), Inches(1.0), Inches(0.3))
    tf = num_box.text_frame
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = f"{slide_num:02d} / {total_slides:02d}"
    p.alignment = PP_ALIGN.RIGHT
    p.font.name = FONT_BODY
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_GOLD

    return slide
def add_card(slide, left, top, width, height, fill_color=CARD_BG, border_color=CARD_BORDER):
    """Draws a rounded rectangular card container."""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.2)
    else:
        shape.line.fill.background()
    shape.adjustments[0] = 0.04  # Subtle rounded corners
    return shape

def add_badge(slide, left, top, badge_type):
    """Adds a small styled pill badge (REAL, DERIVED, MODELLED, SIMULATED)."""
    text_color, fill_color = BADGE_COLORS.get(badge_type, (TEXT_WHITE, CARD_BORDER))
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Inches(0.95), Inches(0.24))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.color.rgb = text_color
    shape.line.width = Pt(0.8)
    shape.adjustments[0] = 0.4
    tf = shape.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = badge_type
    p.alignment = PP_ALIGN.CENTER
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.bold = True
    p.font.color.rgb = text_color
    return shape

def add_speaker_notes(slide, notes_dict):
    """Attaches structured speaker notes containing talking points, numbers, caveats, and Q&A."""
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = f"--- TIMING: {notes_dict.get('timing', '1 min')} ---\n\n"
    text_frame.text += f"TALKING POINTS:\n{notes_dict.get('points', '')}\n\n"
    text_frame.text += f"EXACT NUMBERS:\n{notes_dict.get('numbers', '')}\n\n"
    text_frame.text += f"HONEST CAVEAT:\n{notes_dict.get('caveat', '')}\n\n"
    text_frame.text += f"JUDGE Q&A:\nQ: {notes_dict.get('question', '')}\nA: {notes_dict.get('answer', '')}\n"
