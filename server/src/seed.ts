/**
 * Seeds a small demo universe: two story constellations joined by a crossover,
 * plus a neglected story that demonstrates the "glowing for attention" state.
 * Run: npm run seed   (wipes existing data)
 */
import { db, createAuthor, createNode } from "./db.js";

db.exec("DELETE FROM votes; DELETE FROM links; DELETE FROM nodes; DELETE FROM authors;");

const authors = Array.from({ length: 6 }, () => createAuthor());
const author = (i: number) => authors[i % authors.length].id;
const daysAgo = (d: number) => Date.now() - d * 24 * 60 * 60 * 1000;

function node(opts: {
  id: string;
  title: string;
  body: string;
  by: number;
  parents?: string[];
  daysAgo: number;
}) {
  createNode({
    id: opts.id,
    title: opts.title,
    body: opts.body,
    authorId: author(opts.by),
    parentIds: opts.parents ?? [],
    createdAt: daysAgo(opts.daysAgo),
  });
}

// ---------- Universe A: the fallen sword ----------

node({
  id: "sword-genesis",
  title: "The Sword That Fell From the Sky",
  by: 0,
  daysAgo: 21,
  body: `On the night of the double moon, something bright tore across the heavens and buried itself in Widow's Field. By morning the wheat for a hundred paces in every direction had turned to glass, and at the center of the circle stood a sword — upright, humming faintly, untouched by soil.

Old Marta, who had seen wars and worse, forbade anyone from going near it. Naturally, by sundown, half the village had.`,
});

node({
  id: "smiths-daughter",
  title: "The Smith's Daughter",
  by: 1,
  parents: ["sword-genesis"],
  daysAgo: 19,
  body: `It was Ilsa, the smith's daughter, who finally touched it. Not out of bravery — out of professional offense. No blade should hum like that. Humming meant a flaw in the steel, and flaws were her family's business.

The moment her fingers closed around the grip, the humming stopped. The sword went quiet the way a room goes quiet when someone interesting walks in. And then, very softly, in a voice like a whetstone on a winter morning, it said: "Finally. Someone with calluses."`,
});

node({
  id: "kings-decree",
  title: "The King's Decree",
  by: 2,
  parents: ["sword-genesis"],
  daysAgo: 18,
  body: `Word travels faster than wisdom. Within a fortnight, a royal herald arrived with forty soldiers and a proclamation: the star-metal was property of the Crown, the field was hereby annexed, and any villager who had touched, approached, or *dreamed about* the sword was to present themselves for questioning.

The soldiers built a fence around the glass circle. On the first night, the fence was found neatly folded into a square, like laundry. The sword had not moved.`,
});

node({
  id: "voice-in-steel",
  title: "A Voice in the Steel",
  by: 3,
  parents: ["smiths-daughter"],
  daysAgo: 15,
  body: `The sword's name — as best Ilsa could pronounce it — was Kel. It claimed to remember almost nothing: only falling, and before the falling, cold. A long cold, longer than kingdoms. It asked her strange questions. What year was it, and in which reckoning? Had the sky changed? Were there still "wardens" in the mountains?

"You're not a sword at all, are you," Ilsa said one evening, oiling the blade that did not need oiling.

"I am currently a sword," said Kel, with great dignity. "Before that, I was mostly a door."`,
});

// ---------- Universe B: the ship under the ice ----------

node({
  id: "ice-genesis",
  title: "Signal from the Ice",
  by: 4,
  daysAgo: 20,
  body: `Survey Station Callas sat on four kilometers of Antarctic ice, drilling for climate cores and finding, on a Tuesday, a radio signal instead. It came from below. Two point eight kilometers below.

The signal was a repeating sequence of prime numbers, which was the good news, because primes meant intelligence. The bad news was discovered by Dr. Okonkwo at 0300: the sequence wasn't repeating. It was counting down.`,
});

node({
  id: "thaw-protocol",
  title: "Thaw Protocol",
  by: 5,
  parents: ["ice-genesis"],
  daysAgo: 17,
  body: `The borehole camera reached the source on day nine: a hull. Curved, seamless, the grey of a heart-attack sky, and warm — the ice around it had been melting for centuries, refreezing above it like a scab. The countdown, Okonkwo now estimated, had been running for roughly eleven thousand years.

It reached zero at 0416 local time, while the whole station watched the feed. Nothing exploded. Instead, a hatch opened, and the ship — politely, unmistakably — turned on its porch light.`,
});

node({
  id: "leave-it-buried",
  title: "Leave It Buried",
  by: 0,
  parents: ["ice-genesis"],
  daysAgo: 16,
  body: `Mission Control's answer was a single page, mostly redactions, ending in three legible words: LEAVE IT BURIED.

Station Chief Aldana read it twice, folded it into a paper crane, and set it on the console. She had spent thirty years watching institutions choose ignorance because ignorance was cheaper. "Log this," she told the room. "At 0900 station time, Survey Station Callas experienced a total, tragic, and extremely convenient failure of its uplink antenna. Repairs may take weeks. Drill team, you're on shift in twenty minutes."`,
});

node({
  id: "cartographer-mutiny",
  title: "The Cartographer's Mutiny",
  by: 1,
  parents: ["thaw-protocol"],
  daysAgo: 12,
  body: `Inside, the ship was bigger than the borehole math allowed, which the survey team agreed not to discuss until they'd slept. The corridors rearranged themselves — not menacingly, but helpfully, like a hotel upgrading your room mid-stay. Every wall was a map.

Rios, the team's actual cartographer, stopped dead in the third corridor. The maps weren't of Earth. They were of Earth *plus extras*: continents annotated in a spidery hand, mountains that didn't exist, and in the southern hemisphere of one projection, a small island labeled — in perfectly ordinary letters — "DO NOT LOSE AGAIN."`,
});

// ---------- The crossover: red string across the void ----------

node({
  id: "blade-remembers",
  title: "The Blade Remembers Falling",
  by: 2,
  parents: ["voice-in-steel", "thaw-protocol"],
  daysAgo: 9,
  body: `Kel woke Ilsa an hour before dawn, humming for the first time since the field.

"The cold," it said. "I remember the cold now. I was not falling, smith's daughter. I was *thrown* — thrown clear when the ship went down into the white. A door, sealed and flung, so that what we carried could never be opened in one place."

Ilsa sat up slowly. "The ship went down where?"

"South. Under more winter than you have words for. And someone," Kel's hum sharpened to a whine she felt in her teeth, "has just turned the porch light on."`,
});

node({
  id: "two-skies",
  title: "Two Skies, One Wound",
  by: 3,
  parents: ["blade-remembers"],
  daysAgo: 5,
  body: `Eleven thousand years is a long time, but it is not long enough to matter to a door.

At Station Callas, Rios traced the spidery annotations to their margin, where a final note curled like a signature: "The key wears iron now, and walks." At the same moment — under a different sky, in a kingdom with no name for Antarctica — Ilsa strapped Kel across her back, left a note for her father with the good hammer, and started walking south.

Between them, the world quietly began to fold.`,
});

// ---------- Universe C: neglected, glowing for attention ----------

node({
  id: "library-genesis",
  title: "The Last Library",
  by: 4,
  daysAgo: 14,
  body: `The library appeared on the corner of Vesper and 9th on a Sunday, occupying a lot that everyone remembered as a parking structure. It was open. It had always been open, said the plaque by the door, which was a strange thing for a plaque to insist.

Inside, the shelves held exactly one copy of every book never written: the sequels abandoned, the memoirs burned, the novels people meant to start on Monday. The late fees, the librarian warned, were paid in memory.`,
});

node({
  id: "the-borrower",
  title: "The Borrower",
  by: 5,
  parents: ["library-genesis"],
  daysAgo: 10,
  body: `Marcus checked out a slim volume titled "The Apology I Owed My Brother," by an author whose name he recognized from his own mail. He read it on a bench outside in one sitting, crying in the specific way of a man who has just been handed his own missing piece.

When he went back in to return it, the librarian shook her head. "That one's a reference copy now. You wrote it by reading it." She slid a card across the desk. "Late fee's waived. First loss is free. It's the second visit that costs."`,
});

// ---------- votes ----------

const vote = db.prepare(
  "INSERT INTO votes (node_id, author_id, created_at) VALUES (?, ?, ?)"
);
const sprinkle: Record<string, number> = {
  "sword-genesis": 5,
  "smiths-daughter": 4,
  "voice-in-steel": 3,
  "kings-decree": 1,
  "ice-genesis": 4,
  "thaw-protocol": 5,
  "leave-it-buried": 2,
  "cartographer-mutiny": 3,
  "blade-remembers": 6,
  "two-skies": 3,
  "library-genesis": 2,
  "the-borrower": 1,
};
for (const [nodeId, count] of Object.entries(sprinkle)) {
  for (let i = 0; i < count; i++) vote.run(nodeId, author(i), Date.now());
}

const counts = db
  .prepare(
    "SELECT (SELECT COUNT(*) FROM nodes) AS nodes, (SELECT COUNT(*) FROM links) AS links, (SELECT COUNT(*) FROM votes) AS votes"
  )
  .get() as { nodes: number; links: number; votes: number };
console.log(
  `Seeded ${counts.nodes} nodes, ${counts.links} links, ${counts.votes} votes across 3 story universes (1 crossover).`
);
