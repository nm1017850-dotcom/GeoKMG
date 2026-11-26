#!/usr/bin/env python3
"""Build the offline reading supplement from the repository's scanned source pages."""

import argparse
import json
import re
from collections import Counter, defaultdict
from itertools import zip_longest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "GeoKMG.html"
UNIT_COUNT = 1006
SOURCES = {
    "latyshova": "train_latyshova.md",
    "basniev": "train_basniev.md",
    "kuznetsov": "train_kuznetsov.md",
    "vendelshtein": "ctrl_vendelshtein.md",
    "barenblatt": "ctrl_barenblatt.md",
    "baraboshkin": "ctrl_baraboshkin_b.md",
}
START = "// BEGIN GENERATED SOURCE READING"
END = "// END GENERATED SOURCE READING"
PAGE_MARKER = re.compile(r"(?m)^<!--[ \t]*page[ \t]+(\d+)[ \t]*-->[ \t]*$")
FIGURE_MARKER = re.compile(r"^[-━\s]*FORMAT\s+\d+\s*:")
CAPTION = re.compile(r"^(?:рис\.|fig\.)\s*\d", re.IGNORECASE)
EQUATION_LABEL = re.compile(r"\(([IVX]+(?:\.\d+)+|\d+(?:\.\d+)+)\)\s*[.,;]?\s*(?:\$\$|\\\])?$")
FILLERS = {"где", "или", "задача", "задачи", "задачи и упражнения"}


def embedded_json(html, name):
    prefix = f"window.{name} = "
    line = next(line for line in html.splitlines() if line.startswith(prefix))
    return json.loads(line[len(prefix):-1])


def read_pages(course_id, scan_pages):
    source = (ROOT / SOURCES[course_id]).read_text(encoding="utf-8-sig")
    split = PAGE_MARKER.split(source)
    pages = {}
    for number, raw in zip(split[1::2], split[2::2]):
        page = int(number)
        if page in pages:
            raise ValueError(f"{course_id}: duplicate OCR page {page}")
        pages[page] = [" ".join(block.split()) for block in re.split(r"\n\s*\n", raw.strip())]
    return {page: pages[page] for page in sorted(scan_pages)}


def make_item(page, index, text, figure_note):
    item = {"unit_id": f"p{page:03}.{index:03}", "page_pdf": page}
    if text.startswith(("$$", r"\[")):
        item["kind"] = "equation"
        label = EQUATION_LABEL.search(text)
        if label:
            item["equation"] = label[1]
    elif text.startswith("|"):
        item["kind"] = "table_note" if figure_note else "table"
    elif FIGURE_MARKER.match(text):
        item["kind"] = "figure"
    else:
        if figure_note:
            item["kind"] = "figure_note"
        item["quote"] = re.sub(r"^#{1,6}\s+", "", text)
    return item


def new_items(course, scans):
    scan_pages = {
        int(page): record for page, record in course["pages"].items()
        if record.get("scan") in scans
    }
    pages = read_pages(course["id"], scan_pages)
    existing = {
        item["unit_id"] for step in course["steps"]
        for group in step.get("sourceReading", [])
        for item in group["excerpts"]
    }
    occurrences = defaultdict(set)
    for page, blocks in pages.items():
        for text in blocks:
            occurrences[text].add(page)

    for page, blocks in pages.items():
        figure_note = False
        for index, text in enumerate(blocks, 1):
            if FIGURE_MARKER.match(text):
                figure_note = True
            elif text.startswith("KEYWORDS:"):
                figure_note = False
                continue
            elif CAPTION.match(text) or text.startswith("#") or re.fullmatch(r"[-━]{3,}", text):
                figure_note = False

            if (not text or text.isdecimal() or text.lower().strip("# ") in FILLERS
                    or re.fullmatch(r"[-–—*_.=━ ]+", text)
                    or (len(occurrences[text]) >= 3 and len(text) <= 110 and text == text.upper())
                    or f"p{page:03}.{index:03}" in existing):
                continue
            yield bool(scan_pages[page].get("reference")), make_item(page, index, text, figure_note), pages


def step_anchors(course, pages):
    anchors = []
    for step in course["steps"]:
        for group in step.get("sourceReading", []):
            for item in group["excerpts"]:
                page = item["page_pdf"]
                index = int(item["unit_id"].rsplit(".", 1)[1])
                anchors.append((page, index, 0, step["id"]))

        prefix = f'{course["id"]}.{step["id"]}#'
        for claim_id, claim in course["claims"].items():
            page = claim["page"]
            if not claim_id.startswith(prefix) or page not in pages:
                continue
            quote = " ".join(claim.get("quote", "").split())
            match = next((i for i, block in enumerate(pages[page], 1) if quote and quote in block), None)
            anchors.append((page, match or (len(pages[page]) + 1) // 2, 1 if match else 2, step["id"]))
    if not anchors:
        raise ValueError(f'{course["id"]}: no source anchors for its lessons')
    return anchors


def nearest_step(item, anchors):
    page = item["page_pdf"]
    index = int(item["unit_id"].rsplit(".", 1)[1])
    return min(anchors, key=lambda a: (abs(a[0] - page), abs(a[1] - index), a[2]))[3]


def build_supplement(courses, scans):
    lesson_reading = []
    references = defaultdict(list)
    for course in courses:
        anchors = None
        for reference, item, pages in new_items(course, scans):
            course_id = course["id"]
            if reference:
                references[(course_id, item["page_pdf"])].append(item)
            else:
                if anchors is None:
                    anchors = step_anchors(course, pages)
                lesson = nearest_step(item, anchors)
                lesson_reading.append((course_id, lesson, item))

    # Include every eligible lesson-page excerpt, then spread the reference
    # excerpts across scan pages so a single large page cannot dominate.
    reference_budget = UNIT_COUNT - len(lesson_reading)
    if reference_budget < 0:
        raise ValueError("Lesson pages exceed the supplement's unit count")
    if reference_budget:
        for row in zip_longest(*references.values()):
            for key, item in zip(references, row):
                if item is None:
                    continue
                lesson_reading.append((key[0], "_references", item))
                reference_budget -= 1
                if reference_budget == 0:
                    break
            if reference_budget == 0:
                break
    if reference_budget:
        raise ValueError(f"Missing {reference_budget} eligible units with embedded scans")

    result = {}
    for course, step, item in lesson_reading:
        page = str(item["page_pdf"])
        result.setdefault(course, {}).setdefault(step, {}).setdefault(page, []).append(item)
    return result, Counter((c, step == "_references") for c, step, _ in lesson_reading)


def render(supplement):
    # Escape angle brackets so source text cannot end the inline script.
    def encode(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", r"\u003c")

    lines = [START, "window.courseContent.additionalReading = {"]
    for course, steps in supplement.items():
        lines.append(f"  {encode(course)}: {{")
        for step, pages in steps.items():
            lines.append(f"    {encode(step)}: {{")
            for page, items in sorted(pages.items(), key=lambda row: int(row[0])):
                lines.append(f"      {encode(page)}: {encode(items)},")
            lines.append("    },")
        lines.append("  },")
    return "\n".join([*lines, "};", END])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify the embedded supplement is current.")
    args = parser.parse_args()
    html = HTML.read_text(encoding="utf-8")
    previews = embedded_json(html, "courseContent.previews")
    scans = embedded_json(html, "offlineScans")
    supplement, counts = build_supplement(previews, scans)
    generated = render(supplement)
    if START in html:
        output, n = re.subn(re.escape(START) + r".*?" + re.escape(END), lambda _: generated, html, flags=re.S)
        if n != 1:
            raise ValueError("Expected one generated source reading block")
    else:
        marker = "\n</script>"
        start_at = html.index("window.courseContent.previews = ")
        pos = html.index(marker, start_at)
        output = html[:pos] + "\n" + generated + html[pos:]
    if args.check:
        if output != html:
            parser.error("GeoKMG.html does not match the source reading generator")
    else:
        HTML.write_text(output, encoding="utf-8")
    for course in previews:
        name = course["id"]
        print(f"{name}: {counts[name, False]} lesson units, {counts[name, True]} reference units")
    print(f"{sum(counts.values())} units with scans")


if __name__ == "__main__":
    main()
