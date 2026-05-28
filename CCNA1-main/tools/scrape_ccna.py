# -*- coding: utf-8 -*-
"""
Tentative de récupération des questions/réponses depuis la page fournie.
ATTENTION: Avant toute utilisation réelle, vérifiez vous-même les conditions d'utilisation du site source.
Ce script:
 - Télécharge la page HTML.
 - Cherche des blocs de texte qui ressemblent à des questions suivies de réponses.
 - Produit un JSON approximatif (data/modules-1-3.json) à réviser manuellement.

Limites:
 - Parsing heuristique fragile.
 - Nécessite 'requests' et 'beautifulsoup4'. Installez avec:
     py -m pip install requests beautifulsoup4

Utilisation:
   py tools/scrape_ccna_modules_1_3.py
"""
import re
import json
import argparse
from urllib.parse import urlparse, urljoin
from pathlib import Path

DEFAULT_URL = "https://ccnareponses.com/modules-1-3-examen-sur-la-connectivite-des-reseaux-de-base-et-les-communications-reponses/"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / 'data' / 'modules-1-3.json'

# Lazy import so script fails gracefully if deps missing
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Dépendances manquantes. Installez: py -m pip install requests beautifulsoup4")
    raise SystemExit(2)

QUESTION_REGEX = re.compile(r"^\s*\d+\.|^Question\s*\d+", re.IGNORECASE)


def extract_listing_links(html: str, base_url: str):
    """Return all question page links found inside #tab-0-ccna-1."""
    soup = BeautifulSoup(html, 'html.parser')
    container = soup.find(id='tab-0-ccna-1')
    if not container:
        return []
    links = []
    for a in container.find_all('a', href=True):
        href = a['href']
        url = urljoin(base_url, href)
        title = a.get_text(" ", strip=True) or a.get('title') or url
        links.append({
            'url': url,
            'title': title,
        })
    return links


def fetch_html(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_container(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    # Prefer exact id; fallback to partial match
    container = soup.find(id='Ccnareponses_Incontent_1')
    if not container:
        container = soup.find('div', id=lambda x: x and 'Ccnareponses_Incontent_1' in x)
    if not container:
        container = soup.find('div', class_=lambda c: c and 'Ccnareponses_Incontent_1' in (c if isinstance(c, str) else ' '.join(c)))
    return container


def parse_qa_from_container(container):
    """Parse questions/answers inside the provided container.
    Pattern observed:
      <p><strong>Question text</strong></p>
      [optional <figure> with <img>]
      <ul>
        <li>Answer A</li>
        <li class="correct_answer">Answer B</li>
        ...
      </ul>
      <div class="message_box announce">... explanation ...</div>
    Repeat.
    """
    results = []

    def is_question_anchor(tag):
        if not getattr(tag, 'name', None):
            return False
        if tag.name in ('p', 'h2', 'h3', 'h4') and tag.find('strong'):
            return True
        return False

    if container is None:
        return results
    
    all_tags = container.find_all(['p', 'h2', 'h3', 'h4'])
    anchors = [t for t in all_tags if is_question_anchor(t)]

    def pick_img_url(img_tag):
        """Return the best candidate URL from lazy-load or src attributes."""
        if not img_tag:
            return None
        attr_order = (
            'data-lazy-src', 'data-src', 'data-original', 'src',
        )
        srcset_order = (
            'data-lazy-srcset', 'data-srcset', 'srcset',
        )
        for attr in attr_order:
            val = img_tag.get(attr)
            if val:
                return val.strip()
        for attr in srcset_order:
            srcset = img_tag.get(attr)
            if srcset:
                parts = [p.strip().split()[0] for p in srcset.split(',') if p.strip()]
                if parts:
                    return parts[0]
        return None
    for q_p in anchors:
        strong = q_p.find('strong')
        question_text = strong.get_text(" ", strip=True) if strong else q_p.get_text(" ", strip=True)
        
        # Remove question numbering prefix (e.g., "1.", "2.", "Question 1", etc.)
        question_text = re.sub(r"^\s*\d+\.\s*", "", question_text)
        question_text = re.sub(r"^Question\s*\d+\s*[:.–-]?\s*", "", question_text, flags=re.IGNORECASE)
        question_text = question_text.strip()

        # Check first if image is in the same tag as the question (e.g., <p><strong>Q</strong><br><img></p>)
        image_url = None
        img_in_same_tag = q_p.find('img')
        if img_in_same_tag:
            image_url = pick_img_url(img_in_same_tag)
        
        # Scan forward through siblings until the next <p><strong> is encountered
        answer_list = None
        for sib in q_p.next_siblings:
            if is_question_anchor(sib):
                break
            # Direct <img> tag
            if getattr(sib, 'name', None) == 'img' and image_url is None:
                image_url = pick_img_url(sib)
            # <img> inside <p>, <figure>, <div>, etc.
            if getattr(sib, 'name', None) in ('p', 'figure', 'div', 'span') and image_url is None:
                img = sib.find('img') if getattr(sib, 'find', None) else None
                image_url = pick_img_url(img)
            if getattr(sib, 'name', None) in ('ul', 'ol') and answer_list is None:
                answer_list = sib

        answers = []
        correct = []
        if answer_list:
            for i, li in enumerate(answer_list.find_all('li', recursive=False)):
                txt = li.get_text(" ", strip=True)
                if not txt:
                    continue
                answers.append(txt)
                classes = li.get('class') or []
                if 'correct_answer' in classes:
                    correct.append(i)

        # Only add entries with some answers; some blocks may be statements or images only
        if question_text and answers:
            results.append({
                'question': question_text,
                'answers': answers,
                'correctAnswers': correct,
                'image': image_url,
                'type': 'image' if image_url else 'text'
            })

    return results


def assign_ids(items):
    for i, it in enumerate(items, start=1):
        it['id'] = i
    return items


def derive_out_from_url(url: str) -> Path:
    data_dir = Path(__file__).resolve().parents[1] / 'data'
    slug = urlparse(url).path.rstrip('/').split('/')[-1]
    # Check if this is an exam/final URL
    if re.search(r"(examen.*final|final.*exam|itnv7.*practice|ccna.*final)", slug, flags=re.IGNORECASE):
        return data_dir / 'final.json'
    # Try to extract 'modules-<numbers>' pattern
    m = re.search(r"(modules?-\d+(?:-\d+)*)", slug, flags=re.IGNORECASE)
    base = (m.group(1).lower() if m else slug.lower()) or 'scraped'
    # Sanitize filename
    base = re.sub(r"[^a-z0-9\-_.]+", "-", base)
    return data_dir / f"{base}.json"


def main():
    parser = argparse.ArgumentParser(description="Scrape CCNA questions into JSON.")
    parser.add_argument('--url', '-u', default=DEFAULT_URL, help='URL de la page à scraper')
    parser.add_argument('--out', '-o', default=None, help="Chemin du fichier JSON de sortie (défaut: dérivé de l'URL)")
    args = parser.parse_args()

    url = args.url
    out_path = Path(args.out) if args.out else derive_out_from_url(url)

    print(f"Téléchargement: {url}")
    html = fetch_html(url)

    listing_links = extract_listing_links(html, url)
    if listing_links:
        print(f"Liste trouvée: {len(listing_links)} liens dans #tab-0-ccna-1")
        written = 0
        for link in listing_links:
            print(f"  -> Scrape {link['title']} ({link['url']})")
            page_html = fetch_html(link['url'])
            container = extract_container(page_html)
            data = parse_qa_from_container(container)
            if not data:
                # Fallback: container was empty or didn't exist, try full page
                print("     Conteneur vide/introuvable, fallback parse page complète")
                full_soup = BeautifulSoup(page_html, 'html.parser')
                data = parse_qa_from_container(full_soup)
            if not data:
                print(f"     [WARN] Aucune question trouvée (parsing échoué)")
            data = assign_ids(data)
            out_file = derive_out_from_url(link['url'])
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"     Écrit {len(data)} questions dans {out_file}")
            written += 1
        print(f"Terminé: {written} fichiers écrits.")
        return 0

    print("Extraction dans le conteneur principal...")
    container = extract_container(html)
    if not container:
        print("Conteneur introuvable: Ccnareponses_Incontent_1")
        # Continue; we'll fallback to page-level parsing below
    # Debug infos
    try:
        if container:
            strong_count = len(container.find_all('strong'))
            ul_count = len(container.find_all('ul'))
            corr_count = len(container.find_all('li', class_='correct_answer'))
            print(f"Debug: strong={strong_count}, ul={ul_count}, correct_li={corr_count}")
    except Exception:
        pass
    data = parse_qa_from_container(container) if container else []
    if not data:
        # Fallback: try parsing entire document
        soup = BeautifulSoup(html, 'html.parser')
        try:
            print("Fallback: parse page-level content")
            strong_count = len(soup.find_all('strong'))
            ul_count = len(soup.find_all('ul'))
            corr_count = len(soup.find_all('li', class_='correct_answer'))
            print(f"Page debug: strong={strong_count}, ul={ul_count}, correct_li={corr_count}")
        except Exception:
            pass
        data = parse_qa_from_container(soup)
    data = assign_ids(data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Écrit {len(data)} questions approximatives dans {out_path}. Complétez les 'correctAnswers' manuellement.")
    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
