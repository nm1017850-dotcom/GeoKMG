"""Build the public GeoKMG edition for Render."""

import json
from pathlib import Path
from shutil import copyfile


ROOT = Path(__file__).resolve().parents[1]
PUBLISH = ROOT / "dist"
SCANS = "window.offlineScans = "
COURSES = "window.courseContent.previews = "
READING_START = "// BEGIN GENERATED SOURCE READING"
READING_END = "// END GENERATED SOURCE READING"


def public_courses(line):
    payload = line.removeprefix(COURSES).strip().removesuffix(";")
    courses = json.loads(payload)
    if not courses:
        raise ValueError("Expected embedded GeoKMG courses")
    for course in courses:
        course.pop("sourceIndex", None)
        for page in course["pages"].values():
            page.pop("scan", None)
        for step in course["steps"]:
            step.pop("sourceReading", None)
    return COURSES + json.dumps(courses, ensure_ascii=False) + ";\n"


def build():
    source = (ROOT / "GeoKMG.html").read_text(encoding="utf-8")
    before, start, remainder = source.partition(READING_START)
    _, end, after = remainder.partition(READING_END)
    if not start or not end or READING_START in after:
        raise ValueError("Expected one generated source reading block")

    lines = (before + after).splitlines(keepends=True)
    if sum(line.startswith(SCANS) for line in lines) != 1:
        raise ValueError("Expected one embedded scan library")
    if sum(line.startswith(COURSES) for line in lines) != 1:
        raise ValueError("Expected one embedded course library")

    output = "".join(
        public_courses(line) if line.startswith(COURSES) else line
        for line in lines
        if not line.startswith(SCANS)
    )
    if SCANS in output or "assets/scans/" in output:
        raise ValueError("Public build still contains source scans")

    PUBLISH.mkdir(exist_ok=True)
    unexpected = {file.name for file in PUBLISH.iterdir()} - {"GeoKMG.html", "index.html"}
    if unexpected:
        raise ValueError(f"Unexpected files in the publish directory: {sorted(unexpected)}")
    (PUBLISH / "GeoKMG.html").write_text(output, encoding="utf-8")
    copyfile(ROOT / "index.html", PUBLISH / "index.html")


if __name__ == "__main__":
    build()
