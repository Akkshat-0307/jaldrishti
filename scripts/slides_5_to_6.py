"""Slide 5 and Slide 6 builders for JalDrishti ASTRA 2026 presentation."""
import os
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from scripts.presentation_helpers import (
    create_base_slide, add_card, add_badge, add_speaker_notes,
    FONT_TITLE, FONT_BODY, BG_NAVY, CARD_BG, CARD_BORDER, ACCENT_GOLD,
    ICE_BLUE, TEXT_WHITE, TEXT_MUTED, TEXT_DIM
)

def build_slide_5(prs):
    """Slide 5: System Architecture and Resilience."""
    slide = create_base_slide(
        prs,
        "05 / SYSTEM ARCHITECTURE",
        "System Architecture: End-to-End Zero-Network Operational Reliability",
        5
    )

    # Top Architecture Diagram Container
    add_card(slide, Inches(0.8), Inches(1.58), Inches(11.75), Inches(3.35))

    # Architecture Pipeline Nodes (5 Stages)
    stages = [
        ("1. INGESTION", "• Sentinel-1 C-band SAR\n• Copernicus GLO-30 DEM\n• JRC Surface Water\n• OpenStreetMap Roads", ICE_BLUE),
        ("2. PIPELINE", "• PyTorch U-Net Engine\n• 10m Dual-Pol Inference\n• NetworkX Graph Cut\n• Zonal Exposure Engine", ACCENT_GOLD),
        ("3. ARTEFACTS", "• PMTiles Basemap (2.5MB)\n• Slimmed Roads (1.91MB)\n• GeoJSON Polygons\n• Static Manifest Caches", TEXT_WHITE),
        ("4. SERVICES", "• FastAPI REST & SSE\n• Dynamic Route Solver\n• CAP Alert Generator\n• Zero-Network Fallback", ICE_BLUE),
        ("5. CLIENTS", "• Command Center Web\n• MapLibre GL Vector Map\n• Offline PWA Beacon\n• IndexedDB Sync Cache", ACCENT_GOLD)
    ]

    node_width = Inches(2.1)
    node_height = Inches(2.2)
    node_top = Inches(2.2)
    node_start = Inches(1.05)
    node_gap = Inches(0.28)

    for i, (title, details, border_col) in enumerate(stages):
        cur_left = node_start + i * (node_width + node_gap)
        
        # Node Card
        node = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cur_left, node_top, node_width, node_height)
        node.fill.solid()
        node.fill.fore_color.rgb = BG_NAVY
        node.line.color.rgb = border_col
        node.line.width = Pt(1.5)
        node.adjustments[0] = 0.08

        ntf = node.text_frame
        ntf.word_wrap = True
        ntf.margin_left = ntf.margin_right = Inches(0.12)
        ntf.margin_top = Inches(0.15)

        p = ntf.paragraphs[0]
        p.text = title
        p.font.name = FONT_BODY
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = border_col

        p2 = ntf.add_paragraph()
        p2.text = details
        p2.font.name = FONT_BODY
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = TEXT_MUTED
        p2.space_before = Pt(6)

        # Draw connector arrow (except last)
        if i < 4:
            arrow = slide.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW,
                cur_left + node_width + Inches(0.04),
                node_top + Inches(0.95),
                Inches(0.20),
                Inches(0.25)
            )
            arrow.fill.solid()
            arrow.fill.fore_color.rgb = ACCENT_GOLD
            arrow.line.fill.background()

    # Zero-Network Resilience Callout Card
    add_card(slide, Inches(0.8), Inches(5.05), Inches(5.75), Inches(1.75))
    zn_box = slide.shapes.add_textbox(Inches(1.0), Inches(5.15), Inches(5.35), Inches(1.55))
    ztf = zn_box.text_frame
    ztf.word_wrap = True
    ztf.margin_left = ztf.margin_top = ztf.margin_right = ztf.margin_bottom = 0

    zp0 = ztf.paragraphs[0]
    zp0.text = "ZERO-NETWORK FIELD CAPABILITY (DEMO_MODE=1)"
    zp0.font.name = FONT_BODY
    zp0.font.size = Pt(11)
    zp0.font.bold = True
    zp0.font.color.rgb = ACCENT_GOLD

    zp1 = ztf.add_paragraph()
    zp1.text = ("• Operates seamlessly in isolated field headquarters without internet.\n"
                "• Self-hosted vector PMTiles basemap (cachar.pmtiles, 2.5 MB) eliminates Carto/Mapbox API key reliance.\n"
                "• All historical flood, population, and road layers execute from local high-performance static cache.")
    zp1.font.name = FONT_BODY
    zp1.font.size = Pt(9.5)
    zp1.font.color.rgb = TEXT_WHITE
    zp1.space_before = Pt(4)

    # Technology & Acknowledgements Card
    add_card(slide, Inches(6.8), Inches(5.05), Inches(5.75), Inches(1.75))
    tech_box = slide.shapes.add_textbox(Inches(7.0), Inches(5.15), Inches(5.35), Inches(1.55))
    ttf = tech_box.text_frame
    ttf.word_wrap = True
    ttf.margin_left = ttf.margin_top = ttf.margin_right = ttf.margin_bottom = 0

    tp0 = ttf.paragraphs[0]
    tp0.text = "TECHNOLOGY STACK & DATA CITATIONS"
    tp0.font.name = FONT_BODY
    tp0.font.size = Pt(11)
    tp0.font.bold = True
    tp0.font.color.rgb = ICE_BLUE

    tp1 = ttf.add_paragraph()
    tp1.text = "• Stack: PyTorch, NetworkX, GeoPandas, FastAPI, Next.js 14, MapLibre GL, PMTiles.\n" \
               "• Earth Observation: Copernicus Sentinel-1 C-band SAR (ESA), DEM GLO-30.\n" \
               "• Exposure & Roads: WorldPop 2020 (100m constrained), OpenStreetMap contributors.\n" \
               "• Permanent Water & Hydrology: JRC Global Surface Water (EC), Open-Meteo GloFAS."
    tp1.font.name = FONT_BODY
    tp1.font.size = Pt(9.5)
    tp1.font.color.rgb = TEXT_MUTED
    tp1.space_before = Pt(4)

    add_speaker_notes(slide, {
        "timing": "1 min (4:00 - 5:00)",
        "points": "Showcase system architecture and explain why offline robustness is an absolute requirement in flood-ravaged terrain with collapsed telecom infrastructure.",
        "numbers": "2.5 MB PMTiles basemap, 1.91 MB slimmed road network, 100% offline capability under DEMO_MODE=1.",
        "caveat": "Real-time updates synchronize automatically when network connectivity is restored.",
        "question": "How does the system function if internet connectivity completely collapses in the district?",
        "answer": "The entire platform is architected offline-first. The vector basemap is self-hosted via PMTiles, client state is cached in Service Worker IndexedDB, and the FastAPI backend falls back to local static geo-caches."
    })
def build_slide_6(prs):
    """Slide 6: Empirical Results, Benchmarks, and Cachar Case Study."""
    slide = create_base_slide(
        prs,
        "06 / BENCHMARKS & RESULTS",
        "Empirical Validation: Sen1Floods11 Benchmarks and Assam 2022 Results",
        6
    )

    # Left Container: Sen1Floods11 Benchmark Bar Chart
    add_card(slide, Inches(0.8), Inches(1.58), Inches(5.6), Inches(5.2))
    
    chart_title_box = slide.shapes.add_textbox(Inches(1.0), Inches(1.68), Inches(5.2), Inches(0.5))
    ctf = chart_title_box.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0
    cp = ctf.paragraphs[0]
    cp.text = "SEN1FLOODS11 BENCHMARK ACCURACY (IoU)"
    cp.font.name = FONT_BODY
    cp.font.size = Pt(11)
    cp.font.bold = True
    cp.font.color.rgb = ACCENT_GOLD

    # Create Native Bar Chart
    chart_data = CategoryChartData()
    chart_data.categories = ['Global Test Split', 'Bolivia Held-Out']
    chart_data.add_series('Tier A (Otsu Threshold)', (0.2168, 0.3736))
    chart_data.add_series('Tier B (JalDrishti U-Net)', (0.6804, 0.6879))

    x, y, cx, cy = Inches(1.0), Inches(2.22), Inches(5.2), Inches(2.95)
    chart = slide.shapes.add_chart(
        XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data
    ).chart

    chart.has_legend = True
    chart.legend.position = XL_LEGEND_POSITION.TOP
    chart.legend.include_in_layout = False
    chart.legend.font.name = FONT_BODY
    chart.legend.font.size = Pt(9)
    chart.legend.font.color.rgb = TEXT_WHITE

    # Style series colors
    chart.series[0].format.fill.solid()
    chart.series[0].format.fill.fore_color.rgb = TEXT_MUTED
    chart.series[1].format.fill.solid()
    chart.series[1].format.fill.fore_color.rgb = ICE_BLUE

    # Adjust axes
    val_axis = chart.value_axis
    val_axis.has_major_gridlines = True
    val_axis.major_gridlines.format.line.color.rgb = CARD_BORDER
    val_axis.tick_labels.font.name = FONT_BODY
    val_axis.tick_labels.font.size = Pt(8.5)
    val_axis.tick_labels.font.color.rgb = TEXT_MUTED

    cat_axis = chart.category_axis
    cat_axis.tick_labels.font.name = FONT_BODY
    cat_axis.tick_labels.font.size = Pt(9)
    cat_axis.tick_labels.font.color.rgb = TEXT_WHITE

    # Annotation text below chart
    ann_box = slide.shapes.add_textbox(Inches(1.0), Inches(5.3), Inches(5.2), Inches(1.3))
    atf = ann_box.text_frame
    atf.word_wrap = True
    atf.margin_left = atf.margin_top = atf.margin_right = atf.margin_bottom = 0
    ap = atf.paragraphs[0]
    ap.text = ("• Test Split IoU: Otsu 0.2168 vs JalDrishti U-Net 0.6804 (+213.8%).\n"
               "• Bolivia Held-Out: Otsu 0.3736 vs JalDrishti U-Net 0.6879 (+84.1%).\n"
               "• Dual-pol (VV+VH) context eliminates speckle & shadow false alarms.")
    ap.font.name = FONT_BODY
    ap.font.size = Pt(9.5)
    ap.font.color.rgb = TEXT_WHITE

    # Right Container 1: Cachar Empirical Metrics
    add_card(slide, Inches(6.6), Inches(1.58), Inches(5.95), Inches(2.7))
    m_box = slide.shapes.add_textbox(Inches(6.8), Inches(1.68), Inches(5.55), Inches(2.45))
    mtf = m_box.text_frame
    mtf.word_wrap = True
    mtf.margin_left = mtf.margin_top = mtf.margin_right = mtf.margin_bottom = 0

    mp0 = mtf.paragraphs[0]
    mp0.text = "CACHAR DISTRICT, ASSAM (2022 EVENT IMPACT)"
    mp0.font.name = FONT_BODY
    mp0.font.size = Pt(11)
    mp0.font.bold = True
    mp0.font.color.rgb = ACCENT_GOLD

    metrics_list = [
        ("Peak Flood Inundation:", " 9,975.59 ha (99.76 km²) across 215 polygons [DERIVED]"),
        ("Exposed Population:", " 101,986 residents (23.9% of study window) [MODELLED]"),
        ("Cut-Off Settlement Zones:", " 8 of 20 zones cut off (100,310 residents isolated)\n  (3 robust interior: zone_13, zone_18, zone_20) [DERIVED]"),
        ("Severed Road Segments:", " 196.35 km cut under 50m buffer (973 segments) [DERIVED]")
    ]
    for label, val in metrics_list:
        p = mtf.add_paragraph()
        p.space_before = Pt(4)
        r1 = p.add_run()
        r1.text = label
        r1.font.name = FONT_BODY
        r1.font.size = Pt(10)
        r1.font.bold = True
        r1.font.color.rgb = ICE_BLUE
        r2 = p.add_run()
        r2.text = val
        r2.font.name = FONT_BODY
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = TEXT_WHITE

    # Right Container 2: Multi-Temporal & Engineering Proof
    add_card(slide, Inches(6.6), Inches(4.45), Inches(5.95), Inches(2.35))
    e_box = slide.shapes.add_textbox(Inches(6.8), Inches(4.55), Inches(5.55), Inches(2.15))
    etf = e_box.text_frame
    etf.word_wrap = True
    etf.margin_left = etf.margin_top = etf.margin_right = etf.margin_bottom = 0

    ep0 = etf.paragraphs[0]
    ep0.text = "MULTI-TEMPORAL EVOLUTION & VERIFICATION"
    ep0.font.name = FONT_BODY
    ep0.font.size = Pt(11)
    ep0.font.bold = True
    ep0.font.color.rgb = ACCENT_GOLD

    ep1 = etf.add_paragraph()
    ep1.text = ("• Multi-Temporal: May 1 Dry (0 ha) → June 18 Peak (9,976 ha, 101,986 exp) → "
                "June 30 Recession (4,995 ha, 83,393 exp).\n"
                "• Engineering Rigour: 74/74 unit/integration tests passing (CI Green); "
                "Lighthouse: 100/100 Performance, 96/100 Accessibility.\n"
                "• Caveat: Model trained on Sen1Floods11 labels; Assam verification grounded in administrative media reports & historical gauge records.")
    ep1.font.name = FONT_BODY
    ep1.font.size = Pt(9.5)
    ep1.font.color.rgb = TEXT_WHITE
    ep1.space_before = Pt(4)

    add_speaker_notes(slide, {
        "timing": "1 min (5:00 - 6:00)",
        "points": "Highlight the machine learning breakthrough: U-Net triples Otsu threshold accuracy (68% vs 21.7%). Review concrete Cachar ground metrics: 9,975.59 ha, 101,986 exposed, 8 cut-off zones, 196.35 km roads severed.",
        "numbers": "0.6804 test IoU (+213.8%), 9,975.59 ha inundation, 101,986 exposed population, 8 cut-off zones, 196.35 km roads cut, 74 tests passing.",
        "caveat": "High-resolution ground truth LiDAR is unavailable during active monsoon floods; verification relies on administrative reports and gauge stations.",
        "question": "Why did Otsu perform so poorly on Sen1Floods11 compared to U-Net?",
        "answer": "Otsu thresholding relies strictly on pixel histograms. In flood imagery, radar shadow behind hills and wet soil create low backscatter identical to water, causing massive false positives. U-Net uses spatial context to distinguish real standing water."
    })
