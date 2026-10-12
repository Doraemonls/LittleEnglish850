"""Compile authored UTF-8 TSV into the fixed 170-course catalogue."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'content/source-words.json').read_text(encoding='utf-8'))
entries = {}
for path in sorted((root / 'content').glob('*.tsv')):
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line:
            continue
        word, meaning, sentence, translation, illustration = line.split('\t')
        assert word not in entries, word
        entries[word] = (meaning, sentence, translation, illustration)
assert set(entries) == {entry['word'] for entry in source}, 'Authored words must match all 850 source words'

first = 'apple ball cat dog book cup egg milk bread water red blue green small good in on under go have'.split()
ordered = first + [e['word'] for group in ['Things', 'Operations', '400 general', 'Qualities'] for e in source if e['group'].startswith(group) and e['word'] not in first]
assert len(ordered) == len(set(ordered)) == 850
groups = {e['word']: e['group'] for e in source}
verbs = set('come get give go keep let make put seem take be do have say see send'.split())
pronouns = set('I he you who'.split())
conjunctions = set('and because but or if though while'.split())
determiners = set('a the all any every no other some such that this enough little much'.split())
prepositions = set('about across after against among at before between by from in off on over through to under with as for of till than'.split())

glossary_path = root / 'content/support.json'
glossary = json.loads(glossary_path.read_text(encoding='utf-8')) if glossary_path.exists() else {}
dictionary = {key.lower(): value[0] for key, value in entries.items()}
unknown = set()
words = []
for index, word in enumerate(ordered):
    meaning, sentence, translation, illustration = entries[word]
    pos = '形容词' if groups[word].startswith('Qualities') else '名词'
    if groups[word].startswith('Operations'):
        pos = '动词' if word in verbs else '情态动词' if word in ['may', 'will'] else '代词' if word in pronouns else '连词' if word in conjunctions else '限定词' if word in determiners else '介词' if word in prepositions else '副词'
    support = []
    for token in dict.fromkeys(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", sentence)):
        lower = token.lower()
        if lower == word.lower():
            continue
        if lower in glossary:
            support.append({'word': token, 'meaning': glossary[lower], 'audio': 'assets/audio/support-' + lower.replace("'", '_') + '.mp3'})
        elif lower in dictionary:
            support.append({'word': token, 'meaning': dictionary[lower], 'audio': f'assets/audio/{lower}-word.mp3'})
        elif lower not in dictionary:
            unknown.add(lower)
    lesson = ordered[index // 5 * 5:index // 5 * 5 + 5]
    # Correct meanings are always distinct from the two distractors.
    distractors = [w for w in lesson if entries[w][0] != meaning and w != word]
    assert len(distractors) >= 2
    words.append({
        'id': f'ogden-{word.lower()}', 'word': word, 'lessonId': index // 5 + 1, 'position': index % 5 + 1,
        'category': groups[word], 'meaning': meaning, 'partOfSpeech': pos,
        'context': translation, 'illustration': illustration,
        'sentence': sentence, 'sentenceZh': translation, 'support': support,
        'options': [f'ogden-{w.lower()}' for w in [word, *distractors[:2]]],
        'audio': {kind: f'assets/audio/{word.lower()}-{kind}.mp3' for kind in ['word', 'sentence', 'meaning']},
        'sources': ['ogden-wiktionary', 'project-text', 'kokoro'],
    })
(root / 'content/words.json').write_text(json.dumps(words, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'tmp').mkdir(parents=True, exist_ok=True)
(root / 'tmp/support-missing.json').write_text(json.dumps(sorted(unknown), indent=2) + '\n', encoding='utf-8')
print(f'{len(words)} words, 170 lessons; {len(unknown)} supporting forms need explanations')
if unknown:
    print(' '.join(sorted(unknown)))
