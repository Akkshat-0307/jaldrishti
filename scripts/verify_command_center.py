#!/usr/bin/env python3
"""
scripts/verify_command_center.py
Automated browser verification using headless Chrome and Chrome DevTools Protocol (CDP).
Tests:
1. Page load and zero console errors
2. Top bar, KPI strip (6 cards), TimeScrubber, TabDrawer
3. 8-step Guided Tour traversal
4. Accessible Data Table toggle and table semantics
5. TimeScrubber stepping (May 1, June 18, June 30)
6. What-If tab, slider, and planning aid disclaimer
7. Accessibility tree extraction via CDP Accessibility domain
8. Screenshot capture
"""

import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9222
URL = "http://localhost:3000/command-center"

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.req_id = 0
        self.pending = {}
        self.console_errors = []

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50 * 1024 * 1024)
        asyncio.create_task(self._listen())

    async def _listen(self):
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                if "id" in data and data["id"] in self.pending:
                    self.pending[data["id"]].set_result(data)
                elif data.get("method") == "Runtime.consoleAPICalled":
                    params = data.get("params", {})
                    if params.get("type") in ("error", "warning"):
                        text = " ".join([str(arg.get("value", "")) for arg in params.get("args", [])])
                        self.console_errors.append(f"[{params.get('type')}] {text}")
        except websockets.exceptions.ConnectionClosed:
            pass

    async def send(self, method, params=None):
        self.req_id += 1
        msg_id = self.req_id
        fut = asyncio.get_event_loop().create_future()
        self.pending[msg_id] = fut
        payload = {"id": msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(payload))
        return await fut

    async def eval_js(self, expression):
        res = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        val = res.get("result", {}).get("result", {}).get("value")
        return val


async def run_verification():
    import shutil
    user_data_dir = "/tmp/jaldrishti_chrome_profile"
    if os.path.exists(user_data_dir):
        shutil.rmtree(user_data_dir, ignore_errors=True)

    # 1. Start Chrome headless with fresh profile and target URL
    chrome_proc = subprocess.Popen([
        CHROME_BIN,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data_dir}",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1600,1000",
        URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)

    try:
        # Find page tab
        req = urllib.request.Request(f"http://localhost:{PORT}/json/list")
        with urllib.request.urlopen(req) as resp:
            tabs = json.loads(resp.read().decode())
        
        page_tab = next(t for t in tabs if t.get("type") == "page")
        ws_url = page_tab["webSocketDebuggerUrl"]
        client = CDPClient(ws_url)
        await client.connect()

        # Enable domains
        await client.send("Page.enable")
        await client.send("Runtime.enable")
        await client.send("DOM.enable")
        await client.send("Accessibility.enable")

        print("Waiting for page DOM to load...")
        # Wait up to 15s for page to mount and load data
        for _ in range(30):
            ready = await client.eval_js("document.readyState === 'complete' && !!document.querySelector('header')")
            if ready:
                break
            await asyncio.sleep(0.5)

        # Allow TanStack query / static data to resolve
        await asyncio.sleep(3.0)

        results = {}

        # 1. Check title and main elements
        title = await client.eval_js("document.title")
        has_topbar = await client.eval_js("!!document.querySelector('header')")
        has_kpi = await client.eval_js("document.querySelectorAll('[data-testid=\"kpi-card\"]').length || document.querySelectorAll('.grid > div').length > 5")
        print(f"✓ Page Title: '{title}'")
        print(f"✓ TopBar Present: {has_topbar}")
        print(f"✓ KPI Cards Count: {has_kpi}")
        results["page_load"] = bool(title and has_topbar)

        # 2. Check 8-step Guided Tour
        print("\n--- Testing Guided Tour ---")
        tour_btn_text = await client.eval_js("""
            (() => {
                const tourBtn = document.getElementById('tour-button') ||
                                Array.from(document.querySelectorAll('button')).find(b => b.textContent.toLowerCase().includes('tour'));
                if (tourBtn) {
                    tourBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        print(f"✓ Tour button clicked: {tour_btn_text}")
        await asyncio.sleep(0.5)

        tour_steps_verified = 0
        tour_titles = []
        for step_idx in range(1, 9):
            step_info = await client.eval_js("""
                (() => {
                    const dialog = document.querySelector('[role="dialog"]');
                    if (!dialog) return null;
                    const badge = dialog.querySelector('.uppercase')?.textContent.trim();
                    const title = dialog.querySelector('h3')?.textContent.trim();
                    return { badge, title };
                })()
            """)
            print(f"  Step {step_idx} state: {step_info}")
            if step_info and step_info.get("badge") and f"{step_idx} of 8" in step_info["badge"]:
                tour_steps_verified += 1
                tour_titles.append(step_info.get("title"))
            
            # Click Next (or Finish Tour on step 8)
            await client.eval_js("""
                (() => {
                    const dialog = document.querySelector('[role="dialog"]');
                    if (!dialog) return;
                    const nextBtn = Array.from(dialog.querySelectorAll('button')).find(b => 
                        b.textContent.includes('Next') || b.textContent.includes('Finish')
                    );
                    if (nextBtn) nextBtn.click();
                })()
            """)
            await asyncio.sleep(0.3)

        print(f"✓ Verified {tour_steps_verified}/8 Tour Steps: {tour_titles}")
        results["tour_steps"] = tour_steps_verified

        # 3. Test Accessible Data Table Toggle
        print("\n--- Testing Accessible Data Table ---")
        table_toggle = await client.eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const tblBtn = btns.find(b => b.textContent.includes('Table View'));
                if (tblBtn) {
                    tblBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        print(f"✓ Table View toggle clicked: {table_toggle}")
        await asyncio.sleep(0.5)

        table_stats = await client.eval_js("""
            (() => {
                const table = document.querySelector('table');
                if (!table) return null;
                const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
                    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
                    return cells;
                });
                const caption = table.querySelector('caption')?.textContent;
                const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
                return {
                    has_table: true,
                    row_count: rows.length,
                    caption: caption,
                    headers: headers,
                    sample_row: rows[0]
                };
            })()
        """)
        print(f"✓ Table state: row_count={table_stats.get('row_count')}, headers={table_stats.get('headers')}")
        print(f"  Sample row: {table_stats.get('sample_row')}")
        results["accessible_table"] = table_stats

        # Switch back to Map View
        await client.eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const mapBtn = btns.find(b => b.textContent.includes('Map View'));
                if (mapBtn) mapBtn.click();
            })()
        """)
        await asyncio.sleep(0.5)

        # 4. Test TimeScrubber dates
        print("\n--- Testing TimeScrubber ---")
        dates_tested = []
        for d in ["2022-05-01", "2022-06-30", "2022-06-18"]:
            clicked = await client.eval_js(f"""
                (() => {{
                    const btn = document.querySelector("button[aria-label*='Select date {d}']");
                    if (btn) {{
                        btn.click();
                        return true;
                    }}
                    return false;
                }})()
            """)
            await asyncio.sleep(0.4)
            scrubber_info = await client.eval_js("""
                (() => {
                    const scrubber = document.getElementById('time-scrubber');
                    if (!scrubber) return null;
                    const text = scrubber.querySelector('.font-semibold')?.textContent.trim();
                    const subtext = scrubber.querySelector('.font-mono')?.textContent.trim();
                    return { text, subtext };
                })()
            """)
            print(f"  Clicked {d} -> Scrubber display: {scrubber_info}")
            dates_tested.append({"date": d, "display": scrubber_info})
        results["dates_tested"] = dates_tested

        # 5. Test What-If Tab & Disclaimer
        print("\n--- Testing What-If Tab ---")
        whatif_clicked = await client.eval_js("""
            (() => {
                const tab = document.getElementById('whatif-tab');
                if (tab) {
                    tab.click();
                    return true;
                }
                return false;
            })()
        """)
        print(f"✓ What-If tab clicked: {whatif_clicked}")
        await asyncio.sleep(0.5)

        whatif_info = await client.eval_js("""
            (() => {
                const drawer = document.getElementById('tab-drawer');
                if (!drawer) return null;
                const drawerText = drawer.innerText;
                const hasDisclaimer = drawerText.includes('Water-level scenarios are a planning aid, not a forecast.');
                const hasEffectiveLevel = drawerText.includes('Effective Water Level');
                const hasSlider = !!drawer.querySelector('input[type="range"]') || drawerText.includes('Water-Level Delta');
                return {
                    whatif_open: true,
                    has_disclaimer: hasDisclaimer,
                    has_effective_level: hasEffectiveLevel,
                    has_slider: hasSlider
                };
            })()
        """)
        print(f"✓ What-If tab details: {whatif_info}")
        results["whatif"] = whatif_info

        # 6. Accessibility Tree Check via CDP
        print("\n--- Checking Accessibility (AX Tree) ---")
        ax_tree = await client.send("Accessibility.getFullAXTree")
        nodes = ax_tree.get("result", {}).get("nodes", [])
        print(f"✓ Total Accessibility Nodes: {len(nodes)}")
        results["ax_nodes_count"] = len(nodes)

        # 7. Screenshot Capture
        print("\n--- Capturing Screenshot ---")
        os.makedirs("docs/screenshots", exist_ok=True)
        screenshot_data = await client.send("Page.captureScreenshot", {"format": "png"})
        import base64
        img_bytes = base64.b64decode(screenshot_data["result"]["data"])
        with open("docs/screenshots/command_center_phase6.png", "wb") as f:
            f.write(img_bytes)
        print("✓ Saved screenshot to docs/screenshots/command_center_phase6.png")

        print("\n--- Summary of Verification ---")
        print(f"Console errors: {len(client.console_errors)}")
        for err in client.console_errors[:5]:
            print(f"  {err}")

        # Save verification report
        with open("docs/verification_phase6.json", "w") as f:
            json.dump({
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "results": results,
                "console_errors": client.console_errors
            }, f, indent=2)

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(run_verification())
