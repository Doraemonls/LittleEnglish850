import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const words = JSON.parse(fs.readFileSync(path.join(root, 'content', 'words.json'), 'utf8'));
const byWord = new Map(words.map((entry) => [entry.word, entry]));

const units = [
  {
    id: 'body',
    title: 'My Body',
    titleZh: '我的身体',
    words: 'arm bone brain chest chin ear eye face finger foot hair hand head heart knee leg lip mouth muscle neck nerve nose skin stomach throat',
  },
  {
    id: 'clothes',
    title: 'Clothes and My Things',
    titleZh: '衣物与随身物品',
    words: 'bag band boot brush button coat collar comb dress glove hat jewel pocket ring shirt shoe skirt sock stocking trousers umbrella watch pin needle thread',
  },
  {
    id: 'home',
    title: 'At Home',
    titleZh: '在家里',
    words: 'basin bath bed bell bottle box bulb curtain cushion door drain drawer floor frame house kettle key lock oven pump roof shelf table wall window',
  },
  {
    id: 'food-farm',
    title: 'Food and the Farm',
    titleZh: '食物与农场',
    words: 'apple basket berry cake cheese cup egg fork knife nut orange plate pot potato spoon tray cow farm fowl goat horse pig plough seed sheep',
  },
  {
    id: 'animals-nature',
    title: 'Animals and Nature',
    titleZh: '动物与自然',
    words: 'ant bee bird branch cat cloud dog feather fish fly garden island leaf monkey moon rat root snake star stem sun tail tree wing worm',
  },
  {
    id: 'school-shapes',
    title: 'School, Shapes, and Signs',
    titleZh: '学校、形状与标志',
    words: 'angle ball board book camera card circle clock flag horn library line map match parcel pen pencil picture receipt school scissors square stamp ticket whistle',
  },
  {
    id: 'town-travel',
    title: 'Town and Travel',
    titleZh: '城镇与出行',
    words: 'arch army boat brake brick bridge carriage cart church engine gun hospital office pipe plane prison rail sail ship station store street town train wheel',
  },
  {
    id: 'tools-people',
    title: 'People, Tools, and Making',
    titleZh: '人物、工具与制作',
    words: 'baby blade boy bucket chain cord drop girl hammer hook knot nail net rod screw spade sponge spring stick thumb toe tongue tooth whip wire',
  },
  {
    id: 'people-actions',
    title: 'People and Core Actions',
    titleZh: '人物与核心动作',
    words: 'I you he who this that a the be do have say see seem come get give go keep let make put take send will',
  },
  {
    id: 'joining-ideas',
    title: 'Joining Ideas',
    titleZh: '连接想法',
    words: 'and because but or if though while as for of with about against among by than such other some all any every no only even',
  },
  {
    id: 'place-direction',
    title: 'Place and Direction',
    titleZh: '位置与方向',
    words: 'in on under at across down east far forward here near north off out over south there together up west where from through to between',
  },
  {
    id: 'time-questions',
    title: 'Time, Questions, and Amounts',
    titleZh: '时间、提问与数量',
    words: 'may after before till how when why again ever now still then well almost enough little much not quite so very tomorrow yesterday please yes',
  },
  {
    id: 'family-friends',
    title: 'Family and Friends',
    titleZh: '家人与朋友',
    words: 'family father mother brother sister son daughter man woman person friend relation love kiss birth sex self name care help support respect behaviour feeling smile',
  },
  {
    id: 'health-senses',
    title: 'Health and the Senses',
    titleZh: '健康与感官',
    words: 'back bite blood body breath cough disease digestion hearing pain sense smell sneeze taste touch wound rest sleep condition fear shock voice look sound noise',
  },
  {
    id: 'food-cooking',
    title: 'Food and Cooking',
    titleZh: '食物与烹饪',
    words: 'bread milk water butter cook drink food fruit grain meal meat rice salt soup sugar wine jelly oil ice heat fire flame liquid vessel glass',
  },
  {
    id: 'school-learning',
    title: 'Learning at School',
    titleZh: '学校学习',
    words: 'answer chalk education example knowledge language learning letter list note number page paper question reading science teaching test word writing ink print fact memory thought',
  },
  {
    id: 'art-stories',
    title: 'Art, Music, and Stories',
    titleZh: '艺术、音乐与故事',
    words: 'amusement art canvas colour design fiction music paint paste play pleasure rhythm song stage verse ornament polish fold copy mark record story prose form humour',
  },
  {
    id: 'earth-weather',
    title: 'Earth and Weather',
    titleZh: '大地与天气',
    words: 'air earth field flower grass land mountain plant rain river sand sea sky snow stone summer thunder weather wind winter mist dust shade light ray',
  },
  {
    id: 'movement-travel',
    title: 'Movement and Travel',
    titleZh: '运动与旅行',
    words: 'driving fall flight guide harbour journey jump kick lift motion move pull push road roll run slip slope start step stop stretch swim transport walk',
  },
  {
    id: 'materials-making',
    title: 'Materials and Making',
    titleZh: '材料与制造',
    words: 'brass cloth coal copper cork cotton gold industry invention iron leather linen machine metal produce process silk silver steam steel structure substance tin wood wool',
  },
  {
    id: 'forces-machines',
    title: 'Forces and Machines',
    titleZh: '力与机器',
    words: 'adjustment apparatus balance base building burst control crack crush current curve damage destruction edge effect expansion force grip hole instrument mass operation power weight blow',
  },
  {
    id: 'time-change',
    title: 'Time, Events, and Change',
    titleZh: '时间、事件与变化',
    words: 'account act chance change day death development discovery end event existence experience growth history hour increase minute month morning night reaction tendency time week year',
  },
  {
    id: 'community-law',
    title: 'Community, Rules, and Peace',
    titleZh: '社区、规则与和平',
    words: 'authority committee country crime government judge law nation peace protest punishment religion representative rule society war attack fight danger order organization servant secretary porter harmony',
  },
  {
    id: 'business-trade',
    title: 'Business and Trade',
    titleZh: '商业与贸易',
    words: 'advertisement amount business company competition credit debt distribution exchange insurance interest manager market money offer owner payment price profit property rate tax trade value work',
  },
  {
    id: 'ideas-decisions',
    title: 'Ideas and Decisions',
    titleZh: '想法与决定',
    words: 'agreement approval argument attention belief decision discussion doubt idea meeting mind news observation opinion reason request statement suggestion talk theory view connection desire purpose detail',
  },
  {
    id: 'measure-position',
    title: 'Measure and Position',
    titleZh: '测量与位置',
    words: 'addition bit degree direction distance division level limit measure middle part place point position range scale side size top unit way group front comparison selection',
  },
  {
    id: 'everyday-actions',
    title: 'Everyday Actions and Events',
    titleZh: '日常动作与事件',
    words: 'attempt burn cause cover cry impulse join laugh lead need rub shake smash smoke stitch surprise trick trouble turn twist use wash waste wave wax',
  },
  {
    id: 'challenges-systems',
    title: 'Challenges and Systems',
    titleZh: '挑战与系统',
    words: 'animal attraction comfort disgust error expert hate hope insect loss mine poison powder quality regret reward room seat shame sign soap sort space system thing',
  },
  {
    id: 'colour-senses',
    title: 'Colour, Light, and the Senses',
    titleZh: '颜色、光线与感官',
    words: 'red blue green black brown grey white yellow beautiful bright clear dark clean dirty acid bitter sweet cold warm wet dry boiling soft rough smooth',
  },
  {
    id: 'shape-size',
    title: 'Shape, Size, and Position',
    titleZh: '形状、大小与位置',
    words: 'bent cut deep elastic fat flat full hanging hard high hollow long low narrow open parallel right round sharp short straight tall thick thin wide',
  },
  {
    id: 'states-speed',
    title: 'States, Speed, and Readiness',
    titleZh: '状态、速度与准备',
    words: 'automatic broken chemical electric fixed free frequent living material natural new normal quick quiet ready regular slow solid sticky stiff sudden tight waiting awake shut',
  },
  {
    id: 'people-feelings',
    title: 'People, Feelings, and Character',
    titleZh: '人物、感受与性格',
    words: 'able angry chief conscious dependent happy healthy important kind like male married medical military poor responsible serious strong tired violent wise young female foolish sad',
  },
  {
    id: 'logic-time',
    title: 'Logic, Time, and Certainty',
    titleZh: '逻辑、时间与确定性',
    words: 'common complex equal first general great necessary past possible present private probable same second separate true certain complete different false future last late opposite wrong',
  },
  {
    id: 'judgments-contrasts',
    title: 'Everyday Judgments and Contrasts',
    titleZh: '日常判断与对比',
    words: 'good bad safe cruel secret small old early left strange cheap dear simple special public fertile dead ill feeble delicate physical political loose loud mixed',
  },
];

for (const unit of units) unit.words = unit.words.trim().split(/\s+/u);

const unknown = units.flatMap((unit) => unit.words).filter((word) => !byWord.has(word));
const occurrences = new Map();
for (const unit of units) {
  for (const word of unit.words) occurrences.set(word, (occurrences.get(word) ?? 0) + 1);
}
const duplicates = [...occurrences].filter(([, count]) => count > 1).map(([word]) => word);
const missing = words.map((entry) => entry.word).filter((word) => !occurrences.has(word));

const invalidUnitSizes = units.filter((unit) => unit.words.length !== 25).map((unit) => ({ id: unit.id, count: unit.words.length }));

if (process.argv.includes('--audit')) {
  console.log(JSON.stringify({ assigned: occurrences.size, unknown, duplicates, missing, invalidUnitSizes }, null, 2));
  process.exit(unknown.length || duplicates.length || missing.length || invalidUnitSizes.length ? 1 : 0);
}

if (unknown.length || duplicates.length || missing.length || invalidUnitSizes.length) {
  throw new Error(`Course blueprint is incomplete: ${unknown.length} unknown, ${duplicates.length} duplicates, ${missing.length} missing.`);
}

const curriculumOrder = [
  'people-actions',
  'home',
  'family-friends',
  'body',
  'food-farm',
  'food-cooking',
  'clothes',
  'tools-people',
  'animals-nature',
  'school-shapes',
  'school-learning',
  'everyday-actions',
  'place-direction',
  'time-questions',
  'joining-ideas',
  'movement-travel',
  'town-travel',
  'art-stories',
  'earth-weather',
  'health-senses',
  'colour-senses',
  'shape-size',
  'states-speed',
  'people-feelings',
  'measure-position',
  'materials-making',
  'forces-machines',
  'time-change',
  'ideas-decisions',
  'community-law',
  'business-trade',
  'challenges-systems',
  'logic-time',
  'judgments-contrasts',
];

const unitById = new Map(units.map((unit) => [unit.id, unit]));
const orderedUnits = curriculumOrder.map((id) => unitById.get(id));
if (orderedUnits.some((unit) => !unit) || orderedUnits.length !== units.length) {
  throw new Error('Curriculum order must contain every unit exactly once.');
}

const groupSizes = [3, 3, 2, 2, 2, 3, 3, 2, 2, 3];
const planGroupBundles = {
  standard: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]],
  accelerated: [[0, 1], [2, 3, 4], [5, 6], [7, 8, 9]],
};

function splitBySizes(items, sizes) {
  let offset = 0;
  return sizes.map((size) => {
    const result = items.slice(offset, offset + size);
    offset += size;
    return result;
  });
}

const authoredUnits = orderedUnits.map((unit, unitIndex) => {
  const groupedWords = splitBySizes(unit.words, groupSizes);
  return {
    id: unit.id,
    sequence: unitIndex + 1,
    title: unit.title,
    titleZh: unit.titleZh,
    wordCount: unit.words.length,
    groups: groupedWords.map((groupWords, groupIndex) => ({
      id: `${unit.id}-g${String(groupIndex + 1).padStart(2, '0')}`,
      sequence: groupIndex + 1,
      title: `${unit.title}: ${groupWords.join(' · ')}`,
      titleZh: `${unit.titleZh}：${groupWords.map((word) => byWord.get(word).meaning).join('、')}`,
      wordIds: groupWords.map((word) => byWord.get(word).id),
      words: groupWords,
      sharedContext: `Learn and use ${groupWords.join(', ')} in the “${unit.title}” scene.`,
      sharedExample: groupWords.map((word) => byWord.get(word).sentence).join(' '),
      sharedExampleZh: groupWords.map((word) => byWord.get(word).sentenceZh).join(' '),
    })),
  };
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSentenceCloze(word) {
  const matcher = new RegExp(`(^|[^A-Za-z])(${escapeRegExp(word.word)})(?![A-Za-z])`, 'i');
  const match = matcher.exec(word.sentence);
  if (!match) throw new Error(`${word.id}: fixed sentence does not contain target word “${word.word}”.`);
  const answerStart = match.index + match[1].length;
  const answerEnd = answerStart + match[2].length;
  return {
    id: `sentence-cloze-${word.id}`,
    wordId: word.id,
    responseType: 'single-word-text',
    fixedSentence: word.sentence,
    sentenceZh: word.sentenceZh,
    promptBefore: word.sentence.slice(0, answerStart),
    promptAfter: word.sentence.slice(answerEnd),
    displayAnswer: match[2],
    acceptedAnswers: [word.word],
    normalization: 'trim-lowercase-en-US',
    revealAudio: word.audio.sentence,
  };
}

const sentenceClozeItems = words.map(buildSentenceCloze);
const sentenceClozeIdByWordId = new Map(sentenceClozeItems.map((item) => [item.wordId, item.id]));

function buildPlan(planId) {
  const classes = [];
  for (const unit of authoredUnits) {
    planGroupBundles[planId].forEach((groupIndexes, unitClassIndex) => {
      const selectedGroups = groupIndexes.map((index) => unit.groups[index]);
      const classWords = selectedGroups.flatMap((group) => group.words);
      classes.push({
        id: `${planId}-${String(classes.length + 1).padStart(3, '0')}`,
        sequence: classes.length + 1,
        unitId: unit.id,
        unitClass: unitClassIndex + 1,
        title: `${unit.title} ${unitClassIndex + 1}`,
        titleZh: `${unit.titleZh} ${unitClassIndex + 1}`,
        groupIds: selectedGroups.map((group) => group.id),
        wordIds: classWords.map((word) => byWord.get(word).id),
        words: classWords,
        newWordCount: classWords.length,
        exitTest: {
          type: 'sentence-cloze',
          required: true,
          itemIds: classWords.map((word) => sentenceClozeIdByWordId.get(byWord.get(word).id)),
          passRule: 'all-correct',
          retryPolicy: 'retry-incorrect-until-correct',
        },
      });
    });
  }
  return classes;
}

const standardClasses = buildPlan('standard');
const acceleratedClasses = buildPlan('accelerated');

function verifyPlan(planId, classes, minimum, maximum) {
  const assigned = classes.flatMap((courseClass) => courseClass.words);
  const unique = new Set(assigned);
  const invalidClasses = classes.filter((courseClass) => courseClass.newWordCount < minimum || courseClass.newWordCount > maximum);
  const invalidExitTests = classes.filter((courseClass) =>
    courseClass.exitTest.itemIds.length !== courseClass.wordIds.length
    || courseClass.exitTest.itemIds.some((id) => !id),
  );
  if (assigned.length !== 850 || unique.size !== 850 || invalidClasses.length || invalidExitTests.length) {
    throw new Error(`${planId} plan failed coverage or class-size validation.`);
  }
  return {
    classCount: classes.length,
    assignedWordCount: assigned.length,
    uniqueWordCount: unique.size,
    duplicateWordCount: assigned.length - unique.size,
    missingWordCount: words.filter((entry) => !unique.has(entry.word)).length,
    minimumClassSize: Math.min(...classes.map((courseClass) => courseClass.newWordCount)),
    maximumClassSize: Math.max(...classes.map((courseClass) => courseClass.newWordCount)),
    exitTestCount: classes.length,
    exitTestItemPlacements: classes.reduce((total, courseClass) => total + courseClass.exitTest.itemIds.length, 0),
  };
}

const coverage = {
  sourceWordCount: words.length,
  unitCount: authoredUnits.length,
  groupCount: authoredUnits.reduce((total, unit) => total + unit.groups.length, 0),
  fixedSentenceTestItemCount: sentenceClozeItems.length,
  standard: verifyPlan('standard', standardClasses, 4, 6),
  accelerated: verifyPlan('accelerated', acceleratedClasses, 6, 8),
};

const course = {
  schemaVersion: 2,
  courseId: 'little-english-850',
  title: 'Little English 850',
  designStatus: 'curriculum-design',
  note: 'Standard and Accelerated are pacing levels over one shared curriculum, not separate word sets.',
  wordCount: 850,
  assessments: {
    sentenceCloze: {
      schemaVersion: 1,
      title: 'End-of-class sentence test',
      instructions: 'Type the missing English word to complete the fixed sentence.',
      completionRule: 'Every item must be answered correctly before the class result.',
      scoring: 'Record first-attempt correctness and total attempts; retries do not erase the first-attempt result.',
      audioPolicy: 'Do not play full-sentence audio before an answer; reveal it after a correct response.',
      items: sentenceClozeItems,
    },
  },
  plans: {
    standard: {
      title: 'Standard',
      titleZh: '标准学习',
      targetNewWords: 5,
      normalRange: [4, 6],
      estimatedMinutes: [5, 10],
      classes: standardClasses,
    },
    accelerated: {
      title: 'Accelerated',
      titleZh: '加速学习',
      targetNewWords: 7,
      normalRange: [6, 8],
      estimatedMinutes: [10, 15],
      classes: acceleratedClasses,
    },
  },
  units: authoredUnits,
  coverage,
};

function renderClassRows(classes) {
  return classes.map((courseClass) =>
    `| ${courseClass.sequence} | ${courseClass.title} | ${courseClass.newWordCount} | ${courseClass.words.map((word) => `\`${word}\``).join(', ')} |`,
  ).join('\n');
}

const unitSummaryRows = authoredUnits.map((unit) => {
  const standard = standardClasses.filter((courseClass) => courseClass.unitId === unit.id);
  const accelerated = acceleratedClasses.filter((courseClass) => courseClass.unitId === unit.id);
  const range = (items) => `${items[0].sequence}–${items.at(-1).sequence}`;
  return `| ${unit.sequence} | ${unit.title} / ${unit.titleZh} | 25 | ${range(standard)} | ${range(accelerated)} |`;
}).join('\n');

const markdown = `# Little English 850 — Two-Plan Class List

Status: implemented curriculum design. The app uses these generated Standard and Accelerated class definitions.

## Design decision

The two levels are two **pacing levels over the same course**:

- **Standard / 标准学习:** 170 classes, 4–6 new words per class (target 5), about 5–10 minutes plus review.
- **Accelerated / 加速学习:** 136 classes, 6–7 new words per class (target 7), about 10–15 minutes plus review.

Both levels traverse the same 34 units, 340 stable content groups, and all 850 words in the same order. Switching levels changes only the next class bundle; it does not reset word progress. Due review remains separate and must be completed before new content.

## Coverage audit

| Check | Standard | Accelerated |
| --- | ---: | ---: |
| Classes | ${coverage.standard.classCount} | ${coverage.accelerated.classCount} |
| Word placements | ${coverage.standard.assignedWordCount} | ${coverage.accelerated.assignedWordCount} |
| Unique source words | ${coverage.standard.uniqueWordCount} | ${coverage.accelerated.uniqueWordCount} |
| Duplicates | ${coverage.standard.duplicateWordCount} | ${coverage.accelerated.duplicateWordCount} |
| Missing words | ${coverage.standard.missingWordCount} | ${coverage.accelerated.missingWordCount} |
| Class-size range | ${coverage.standard.minimumClassSize}–${coverage.standard.maximumClassSize} | ${coverage.accelerated.minimumClassSize}–${coverage.accelerated.maximumClassSize} |
| End-of-class tests | ${coverage.standard.exitTestCount} | ${coverage.accelerated.exitTestCount} |
| Fixed-sentence test placements | ${coverage.standard.exitTestItemPlacements} | ${coverage.accelerated.exitTestItemPlacements} |

## Unit sequence

| Unit | Theme | Words | Standard classes | Accelerated classes |
| ---: | --- | ---: | ---: | ---: |
${unitSummaryRows}

## Plan 1: Standard class list

| Class | Theme | New words | Word list |
| ---: | --- | ---: | --- |
${renderClassRows(standardClasses)}

## Plan 2: Accelerated class list

| Class | Theme | New words | Word list |
| ---: | --- | ---: | --- |
${renderClassRows(acceleratedClasses)}

## Per-class teaching flow

Each listed class uses the same learning sequence: due-review warm-up; scene preview; introduce the first content group; quick listening/meaning retrieval; introduce remaining groups; mixed recognition and spelling; shared-context finish; required fixed-sentence test; result and next-review message.

The end-of-class test has one item for every new word in that class (4–6 Standard or 6–7 Accelerated). Each item shows the word’s fixed example sentence with the target word replaced by one text field. The child types only the missing word. The class result opens after every item is correct; first-attempt accuracy and total attempts remain available for progress reporting. Full-sentence audio is revealed only after a correct answer so it cannot disclose the answer beforehand.

The JSON source preserves unit, content-group, class, and word IDs for later product implementation. The generated class lists are deterministic and can be rebuilt with \`npm run course:design\`.
`;

fs.writeFileSync(path.join(root, 'content', 'course.json'), `${JSON.stringify(course, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'docs', 'COURSE_CLASS_LIST.md'), markdown, 'utf8');

console.log(`Wrote content/course.json and docs/COURSE_CLASS_LIST.md.`);
console.log(JSON.stringify(coverage, null, 2));
