# -*- coding: utf-8 -*-
"""
Simple CSV -> JSON converter for ExamCisco1.csv
Assumptions based on repository conventions:
- CSV is semicolon-delimited and encoded in ISO-8859-1 (latin-1).
- Columns (observed from legacy parser):
  question;textType;nbResponses;nbCorrect;response1;response2;...;correctIndex1;correctIndex2;...;image
- The converter will read each line, parse the first 4 columns, then read `nbResponses` responses, then read `nbCorrect` correct indices (1-based in CSV) and convert them to 0-based indices.
- If `image` column is empty, set image to None and type to 'text', else type 'image'.

Output schema (JSON): list of objects with fields {
  id: int,
  question: str,
  answers: [str,...],
  correctAnswers: [int,...],  # 0-based indices
  image: str | None,
  type: 'text' | 'image'
}

Generates `exemple/questions_from_csv.json`.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / 'ExamCisco1.csv'
OUT_DIR = ROOT / 'exemple'
OUT_PATH = OUT_DIR / 'questions_from_csv.json'


def parse_csv_to_questions(csv_path):
    questions = []
    # Read as bytes and decode robustly: prefer utf-8-sig (handles BOM), fallback to latin-1
    import io
    with open(csv_path, 'rb') as bf:
        raw = bf.read()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('iso-8859-1')

    # Use csv reader with semicolon delimiter on a text stream
    reader = csv.reader(io.StringIO(text), delimiter=';')
    for idx, row in enumerate(reader, start=1):
            # Skip empty rows
            if not row or all([c.strip() == '' for c in row]):
                continue
            # Defensive: ensure length
            # Minimal expected columns: question, type, nbResponses, nbCorrect
            if len(row) < 4:
                print(f"Skipping malformed row {idx}: not enough columns")
                continue
            question_text = row[0].strip()
            # type in CSV is numeric (1=text, 2=image) historically; handle both
            csv_type = row[1].strip()
            try:
                nb_responses = int(row[2])
            except ValueError:
                nb_responses = 0
            try:
                nb_correct = int(row[3])
            except ValueError:
                nb_correct = 0

            # Responses start at column 4 (0-based index 4)
            responses = []
            start_resp = 4
            for i in range(nb_responses):
                col_idx = start_resp + i
                if col_idx < len(row):
                    responses.append(row[col_idx].strip())
                else:
                    responses.append('')

            # After responses, correct indices follow
            corrects = []
            start_correct = start_resp + nb_responses
            for i in range(nb_correct):
                col_idx = start_correct + i
                if col_idx < len(row) and row[col_idx].strip() != '':
                    try:
                        # CSV uses 1-based indices, convert to 0-based
                        c = int(row[col_idx].strip()) - 1
                        corrects.append(c)
                    except ValueError:
                        pass

            # Image is expected near the end; find last non-empty column after corrects
            image = None
            # The CSV sometimes has many trailing semicolons; look for any non-empty after corrects
            for col in row[start_correct + nb_correct:][::-1]:
                if col.strip() != '':
                    image = col.strip()
                    break

            qtype = 'image' if image else 'text'

            questions.append({
                'id': len(questions) + 1,
                'question': question_text,
                'answers': responses,
                'correctAnswers': corrects,
                'image': image if image else None,
                'type': qtype,
            })
    return questions


def main():
    if not CSV_PATH.exists():
        print(f"CSV file not found: {CSV_PATH}")
        return 2
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    questions = parse_csv_to_questions(CSV_PATH)
    # Write JSON with utf-8
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(questions)} questions to {OUT_PATH}")
    return 0


if __name__ == '__main__':
    import sys
    sys.exit(main())
