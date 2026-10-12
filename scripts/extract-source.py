"""Extract the fixed Wiktionary revision; only explicitly named word sections count."""
from html.parser import HTMLParser
from pathlib import Path
from collections import Counter
import json
import time
import urllib.request

root = Path(__file__).resolve().parents[1]
url = 'https://en.wiktionary.org/w/index.php?title=Appendix:Basic_English_word_list&oldid=87681413'
path = root / 'tmp' / 'ogden-source.html'
path.parent.mkdir(exist_ok=True)
if not path.exists():
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'LittleEnglish850 content preparation'})
            with urllib.request.urlopen(request, timeout=60) as response:
                path.write_text(response.read().decode('utf-8'), encoding='utf-8')
            break
        except Exception as error:
            with (root / 'tmp' / 'content-errors.log').open('a', encoding='utf-8') as log:
                log.write(f'{url}: {error}\n')
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.heading = False
        self.title = self.group = ''
        self.items = []
        self.link = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'h2':
            self.heading = True
            self.title = self.group = ''
        if tag == 'a' and self.group and attrs.get('href', '').startswith('/wiki/') and ':' not in attrs.get('title', ':'):
            self.link = attrs['title']

    def handle_data(self, text):
        if self.heading:
            self.title += text

    def handle_endtag(self, tag):
        if tag == 'h2':
            self.heading = False
            if any(word in self.title for word in ['Operations', '400 general', 'Things', 'Qualities']):
                self.group = self.title
        if tag == 'a' and self.link:
            self.items.append({'word': self.link, 'group': self.group})
            self.link = None

parser = Parser()
parser.feed(path.read_text(encoding='utf-8'))
assert len(parser.items) == len({entry['word'] for entry in parser.items}) == 850
assert sorted(Counter(entry['group'] for entry in parser.items).values()) == [50, 100, 100, 200, 400]
(root / 'content' / 'source-words.json').write_text(json.dumps(parser.items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('850 unique source words; revision 87681413')
