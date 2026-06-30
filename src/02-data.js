/* ---------- PORTED ADVERSARY LIBRARY (verbatim from tor2e-loremaster ADVERSARY_DB; see CLAUDE.md "Phase P0") ----------
   44 canonical adversaries in the loremaster schema. No rules change: loremasterFoeToEncounter() maps each
   to the encounter bestiary-foe shape used by addFoeFromBestiary(). Foe attack TN ~= 10 + attributeLevel,
   matching the existing BESTIARY convention under the current engine (the adversary-attack-TN RAW fix is a
   separate, test-guarded follow-up). features + fell abilities fold into the readable `fell` line. */
const ADVERSARY_DB = [
  // Evil Men & Ruffians
  {
    name: "Southerner Raider",
    category: "Evil Men & Ruffians",
    features: "Canny, Hardened",
    attributeLevel: 4, endurance: 16, might: 1, resolve: 4, parry: 1, armour: 2,
    profs: [
      { name: "Axe", rating: 3, damage: 5, injury: 18, special: "Break Shield" },
      { name: "Short Spear", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Fierce", desc: "Spend 1 Resolve to gain (+1d) and make the attack roll Favoured." }
    ]
  },
  {
    name: "Southerner Champion",
    category: "Evil Men & Ruffians",
    features: "Cruel, Tough",
    attributeLevel: 5, endurance: 20, might: 1, resolve: 5, parry: 2, armour: 3,
    profs: [
      { name: "Spear", rating: 3, damage: 4, injury: 14, special: "Pierce" },
      { name: "Long-hafted Axe", rating: 3, damage: 6, injury: 18, special: "Break Shield" }
    ],
    fellAbilities: [
      { name: "Fierce", desc: "Spend 1 Resolve to gain (+1d) on an attack and make the roll Favoured." }
    ]
  },
  {
    name: "Footpad",
    category: "Evil Men & Ruffians",
    features: "Nimble, Wary",
    attributeLevel: 2, endurance: 8, might: 1, resolve: 2, parry: 0, armour: 1,
    profs: [
      { name: "Cudgel", rating: 2, damage: 3, injury: 12, special: "Break Shield" },
      { name: "Bow", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Craven", desc: "When affected by the Intimidate Foe combat task, the creature also loses 1 Resolve." }
    ]
  },
  {
    name: "Ruffian Chief",
    category: "Evil Men & Ruffians",
    features: "Ruthless, Secretive",
    attributeLevel: 3, endurance: 12, might: 1, resolve: 3, parry: 1, armour: 2,
    profs: [
      { name: "Short Sword", rating: 3, damage: 3, injury: 16, special: "Pierce" },
      { name: "Bow", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Yell of Triumph", desc: "Spend 1 Resolve to restore 1 Resolve to all other Ruffians in the fight." }
    ]
  },
  {
    name: "Highway Robber",
    category: "Evil Men & Ruffians",
    features: "Swift, Vengeful",
    attributeLevel: 4, endurance: 16, might: 1, resolve: 4, parry: 0, armour: 2,
    profs: [
      { name: "Spear", rating: 3, damage: 4, injury: 14, special: "Pierce" },
      { name: "Bow", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Snake-like Speed", desc: "When targeted by an attack, spend 1 Resolve to make the attack roll Ill-favoured." }
    ]
  },
  {
    name: "Black Númenórean Sailor",
    category: "Evil Men & Ruffians",
    features: "Proud, Superstitious",
    attributeLevel: 4, endurance: 16, might: 1, resolve: 4, parry: 1, armour: 2,
    profs: [
      { name: "Axe", rating: 3, damage: 5, injury: 18, special: "Break Shield" }
    ],
    fellAbilities: []
  },
  {
    name: "Black Númenórean Soldier",
    category: "Evil Men & Ruffians",
    features: "Cruel, Disciplined",
    attributeLevel: 5, endurance: 20, might: 1, hate: 5, parry: 3, armour: 3,
    profs: [
      { name: "Long Sword", rating: 3, damage: 5, injury: 16, special: "Pierce" },
      { name: "Great Bow", rating: 3, damage: 4, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Fearless", desc: "This creature's Might is considered 1 higher for the purpose of resisting the Intimidate Foe combat task." },
      { name: "Thick Armour", desc: "Spend 1 Hate to gain (+2d) on a Protection roll." }
    ]
  },
  {
    name: "Black Númenórean Spy",
    category: "Evil Men & Ruffians",
    features: "Deceptive, Patient",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 1, armour: 1,
    profs: [
      { name: "Short Sword", rating: 3, damage: 3, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Craven", desc: "When affected by the Intimidate Foe combat task, the creature also loses 1 Hate." },
      { name: "Snake-like Speed", desc: "When targeted by an attack, spend 1 Hate to make the attack roll Ill-favoured." }
    ]
  },

  // Orcs & Goblins
  {
    name: "Great Orc Chief",
    category: "Orcs & Goblins",
    features: "Bold, Cunning",
    attributeLevel: 7, endurance: 48, might: 2, hate: 7, parry: 3, armour: 4,
    profs: [
      { name: "Heavy Scimitar", rating: 3, damage: 5, injury: 18, special: "Break Shield" },
      { name: "Broad-headed Spear", rating: 3, damage: 5, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Horrible Strength", desc: "If the creature scored a Piercing Blow with a close combat attack, spend 1 Hate to make the target's Protection roll Ill-favoured." },
      { name: "Snake-like Speed", desc: "When targeted by an attack, spend 1 Hate to make the attack roll Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Orcs in the fight." }
    ]
  },
  {
    name: "Great Orc Bodyguard",
    category: "Orcs & Goblins",
    features: "Fierce, Wary",
    attributeLevel: 6, endurance: 24, might: 2, hate: 6, parry: 2, armour: 3,
    profs: [
      { name: "Orc-axe", rating: 3, damage: 5, injury: 18, special: "Break Shield" },
      { name: "Broad-headed Spear", rating: 3, damage: 5, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Hideous Toughness", desc: "Unaffected by unarmed attacks. When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." }
    ]
  },
  {
    name: "Goblin Archer",
    category: "Orcs & Goblins",
    features: "Cunning, Keen-eyed",
    attributeLevel: 2, endurance: 8, might: 1, hate: 2, parry: 0, armour: 1,
    profs: [
      { name: "Bow of Horn", rating: 3, damage: 3, injury: 14, special: "Pierce" },
      { name: "Jagged Knife", rating: 2, damage: 2, injury: 14, special: "Break Shield" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Craven", desc: "When affected by Intimidate Foe, also loses 1 Hate." },
      { name: "Orc-poison", desc: "If an attack results in a Wound, the target is poisoned." }
    ]
  },
  {
    name: "Orc-chieftain",
    category: "Orcs & Goblins",
    features: "Cruel, Hardened",
    attributeLevel: 5, endurance: 20, might: 1, hate: 5, parry: 3, armour: 3,
    profs: [
      { name: "Scimitar", rating: 3, damage: 3, injury: 16, special: "Break Shield" },
      { name: "Spear", rating: 3, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Great Leap", desc: "Spend 1 Hate to attack any player-hero, in any combat stance, including Rearward." },
      { name: "Snake-like Speed", desc: "When targeted, spend 1 Hate to make the attack Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Orcs in the fight." }
    ]
  },
  {
    name: "Orc Guard",
    category: "Orcs & Goblins",
    features: "Strong, Vigilant",
    attributeLevel: 4, endurance: 16, might: 1, hate: 4, parry: 2, armour: 3,
    profs: [
      { name: "Scimitar", rating: 3, damage: 3, injury: 16, special: "Break Shield" },
      { name: "Spear", rating: 3, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." }
    ]
  },
  {
    name: "Orc Soldier",
    category: "Orcs & Goblins",
    features: "Rebellious, Vengeful",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 1, armour: 2,
    profs: [
      { name: "Scimitar", rating: 3, damage: 3, injury: 16, special: "Break Shield" },
      { name: "Spear", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Craven", desc: "When affected by Intimidate Foe, also loses 1 Hate." }
    ]
  },
  {
    name: "Orc Drummers",
    category: "Orcs & Goblins",
    features: "Loud, Grim",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 1, armour: 2,
    profs: [
      { name: "Scimitar", rating: 3, damage: 3, injury: 16, special: "Break Shield" },
      { name: "Spear", rating: 2, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Drums in the Deep", desc: "Instead of attacking, spend 1 Hate to increase the Company's Eye Awareness by 3." }
    ]
  },
  {
    name: "Udûn-orc Fanatic",
    category: "Orcs & Goblins",
    features: "Crazed, Tough",
    attributeLevel: 4, endurance: 16, might: 1, hate: 4, parry: 0, armour: 3,
    profs: [
      { name: "Torch-staff (Fiery Blow)", rating: 3, damage: 2, injury: 12, special: "Fiery Blow" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "All attack rolls Favoured while in darkness." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." }
    ]
  },
  {
    name: "Udûn-orc Fire-touched",
    category: "Orcs & Goblins",
    features: "Frenzied, Fearsome",
    attributeLevel: 6, endurance: 24, might: 2, hate: 6, parry: 0, armour: 3,
    profs: [
      { name: "Torch-staff (Fiery Blow)", rating: 3, damage: 2, injury: 12, special: "Fiery Blow" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "All attack rolls Favoured while in darkness." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." }
    ]
  },
  {
    name: "Black Uruk",
    category: "Orcs & Goblins",
    features: "Fierce, Strong",
    attributeLevel: 5, endurance: 20, might: 1, hate: 5, parry: 2, armour: 3,
    profs: [
      { name: "Broad-bladed Sword", rating: 3, damage: 2, injury: 16, special: "Pierce" },
      { name: "Bow of Horn", rating: 3, damage: 3, injury: 12, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Horrible Strength", desc: "On a Piercing Blow in close combat, spend 1 Hate to make the target's Protection roll Ill-favoured." },
      { name: "Thick Armour", desc: "Spend 1 Hate to gain (+2d) on a Protection roll." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all allies in the fight." }
    ]
  },

  // Trolls
  {
    name: "Great Cave-troll",
    category: "Trolls",
    features: "Brutish, Wicked",
    attributeLevel: 10, endurance: 80, might: 2, hate: 10, parry: 0, armour: 3,
    profs: [
      { name: "Crush", rating: 3, damage: 6, injury: 12, special: "Seize" },
      { name: "Bite", rating: 2, damage: 6, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Dull-witted", desc: "Riddle rolls from Forward stance heroes drain Hate on success." },
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." },
      { name: "Strike Fear", desc: "Spend 1 Hate to make all heroes gain 2 Shadow (Dread). Failed tests block Hope spending." },
      { name: "Thick Hide", desc: "Spend 1 Hate to gain (+2d) on a Protection roll." }
    ]
  },
  {
    name: "Cave-troll Slinker",
    category: "Trolls",
    features: "Stealthy, Wary",
    attributeLevel: 6, endurance: 50, might: 2, hate: 6, parry: 0, armour: 3,
    profs: [
      { name: "Club", rating: 3, damage: 6, injury: 16, special: "Break Shield" },
      { name: "Bite", rating: 2, damage: 6, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Dull-witted", desc: "Riddle rolls from Forward stance heroes drain Hate on success." },
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." },
      { name: "Denizen of the Dark", desc: "All attack rolls Favoured while in darkness." },
      { name: "Fear of Fire", desc: "Loses 1 Hate at start of each round engaged with burning items." },
      { name: "Thick Hide", desc: "Spend 1 Hate to gain (+2d) on a Protection roll." }
    ]
  },
  {
    name: "Stone-troll Robber",
    category: "Trolls",
    features: "Hungry, Irritable",
    attributeLevel: 8, endurance: 60, might: 2, hate: 8, parry: 0, armour: 3,
    profs: [
      { name: "Club", rating: 3, damage: 6, injury: 16, special: "Break Shield" },
      { name: "Crush", rating: 2, damage: 6, injury: 12, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Dull-witted", desc: "Riddle rolls from Forward stance heroes drain Hate on success." },
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." },
      { name: "Hatred (Dwarves)", desc: "When fighting Dwarves, all the creature's rolls are Favoured." },
      { name: "Horrible Strength", desc: "On a Piercing Blow, spend 1 Hate to make the target's Protection roll Ill-favoured." }
    ]
  },
  {
    name: "Stone-troll Chief",
    category: "Trolls",
    features: "Cruel, Suspicious",
    attributeLevel: 9, endurance: 70, might: 2, hate: 9, parry: 0, armour: 3,
    profs: [
      { name: "Club", rating: 3, damage: 6, injury: 16, special: "Break Shield" },
      { name: "Crush", rating: 2, damage: 6, injury: 12, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Dull-witted", desc: "Riddle rolls from Forward stance heroes drain Hate on success." },
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; if alive, resets to half maximum." },
      { name: "Hatred (Dwarves)", desc: "When fighting Dwarves, all rolls Favoured." },
      { name: "Horrible Strength", desc: "On a Piercing Blow, spend 1 Hate to make the target's Protection roll Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Trolls in the fight." }
    ]
  },
  {
    name: "Hill-troll Stalker",
    category: "Trolls",
    features: "Hungry, Wary",
    attributeLevel: 8, endurance: 60, might: 2, hate: 8, parry: 2, armour: 3,
    profs: [
      { name: "Hammer", rating: 3, damage: 6, injury: 16, special: "Break Shield" },
      { name: "Crush", rating: 2, damage: 6, injury: 12, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Dull-witted", desc: "Riddle rolls from Forward stance heroes drain Hate on success." },
      { name: "Hideous Toughness", desc: "On reaching 0 Endurance, causes a Piercing Blow; if alive, returns to full Endurance." },
      { name: "Horrible Strength", desc: "On a Piercing Blow, spend 1 Hate to make the target's Protection roll Ill-favoured." }
    ]
  },

  // Wolves of the Wild
  {
    name: "Wild Wolf",
    category: "Wolves of the Wild",
    features: "Keen-eyed, Grim",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 0, armour: 1,
    profs: [
      { name: "Fangs", rating: 3, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Great Leap", desc: "Spend 1 Hate to attack any Player-hero, in any combat stance, including Rearward." },
      { name: "Fear of Fire", desc: "Loses 1 Hate each round engaged with a burning item." },
      { name: "Snake-like Speed", desc: "When targeted, spend 1 Hate to make the attack Ill-favoured." }
    ]
  },
  {
    name: "Wolf-chieftain",
    category: "Wolves of the Wild",
    features: "Swift, Vicious",
    attributeLevel: 4, endurance: 16, might: 1, hate: 4, parry: 0, armour: 1,
    profs: [
      { name: "Fangs", rating: 3, damage: 4, injury: 14, special: "Pierce" },
      { name: "Claws", rating: 2, damage: 4, injury: 14, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Great Leap", desc: "Spend 1 Hate to attack any Player-hero, in any stance, including Rearward." },
      { name: "Fear of Fire", desc: "Loses 1 Hate each round engaged with a burning item." },
      { name: "Snake-like Speed", desc: "When targeted, spend 1 Hate to make the attack Ill-favoured." },
      { name: "Howl of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Wargs in the fight." }
    ]
  },
  {
    name: "Werewolf — Hound of Sauron",
    category: "Wolves of the Wild",
    features: "Cunning, Fierce",
    attributeLevel: 5, endurance: 20, might: 2, hate: 5, parry: 1, armour: 2,
    profs: [
      { name: "Fangs", rating: 3, damage: 5, injury: 14, special: "Pierce" },
      { name: "Claws", rating: 3, damage: 5, injury: 14, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Great Leap", desc: "Spend 1 Hate to attack any Player-hero, in any stance, including Rearward." },
      { name: "Deadly Wound", desc: "Wounded targets make an Ill-favoured Feat die roll to determine the severity of their injury." },
      { name: "Hideous Toughness", desc: "Unaffected by unarmed; at 0 Endurance, causes a Piercing Blow; resets to half max." }
    ]
  },

  // Undead
  {
    name: "Barrow-wight",
    category: "Undead",
    features: "Cunning, Vengeful",
    attributeLevel: 6, endurance: 24, might: 1, hate: 6, parry: 0, armour: 3,
    profs: [
      { name: "Ancient Sword", rating: 3, damage: 5, injury: 16, special: "Pierce" },
      { name: "Chilling Touch", rating: 2, damage: 6, injury: 12, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Thing of Terror", desc: "Start of round 1: all heroes gain 3 Shadow (Dread); fail blocks Hope spending." },
      { name: "Deathless", desc: "Spend 1 Hate to cancel a Wound or return to full Endurance at 0." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Denizen of the Dark", desc: "All attack rolls Favoured in darkness." },
      { name: "Dreadful Spells", desc: "Spend 1 Hate to force 3 Shadow (Sorcery) on a hero; fail = fall unconscious." },
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." }
    ]
  },
  {
    name: "Marsh-dweller",
    category: "Undead",
    features: "Fierce, Stealthy",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 0, armour: 1,
    profs: [
      { name: "Bite", rating: 3, damage: 3, injury: 14, special: "Pierce" },
      { name: "Claws", rating: 2, damage: 3, injury: 14, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Thing of Terror", desc: "Start of round 1: all heroes gain 3 Shadow (Dread); fail blocks Hope spending." },
      { name: "Deathless", desc: "Spend 1 Hate to cancel a Wound or return to full Endurance at 0." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Fear of Fire", desc: "Loses 1 Hate per round engaged with a burning item." },
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." }
    ]
  },
  {
    name: "The Evil in the Shadows",
    category: "Undead",
    features: "Shadow, Vengeful",
    attributeLevel: 6, endurance: 24, might: 2, hate: 6, parry: 0, armour: 3,
    profs: [
      { name: "Broken Sword", rating: 3, damage: 6, injury: 15, special: "Pierce" },
      { name: "Chilling Touch", rating: 2, damage: 5, injury: 12, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Thing of Terror", desc: "Start of round 1: all heroes gain 3 Shadow (Dread); fail blocks Hope spending." },
      { name: "Deathless", desc: "Spend 1 Hate to cancel a Wound or return to full Endurance at 0." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Denizen of the Dark", desc: "All attack rolls Favoured in darkness." },
      { name: "Dreadful Spells", desc: "Spend 1 Hate to raise a Forgotten Dead and make all heroes gain 2 Shadow (Dread)." },
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Howl of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Undead in the fight." }
    ]
  },
  {
    name: "Forgotten Dead",
    category: "Undead",
    features: "Soulless, Stealthy",
    attributeLevel: 3, endurance: 12, might: 1, hate: 3, parry: 1, armour: 2,
    profs: [
      { name: "Rusted Sword", rating: 3, damage: 4, injury: 15, special: "Pierce" },
      { name: "Claws", rating: 2, damage: 3, injury: 14, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Thing of Terror", desc: "Start of round 1: all heroes gain 3 Shadow (Dread); fail blocks Hope spending." },
      { name: "Deathless", desc: "Spend 1 Hate to cancel a Wound or return to full Endurance at 0." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." }
    ]
  },
  {
    name: "Ash-wraith",
    category: "Undead",
    features: "Fierce, Swift",
    attributeLevel: 4, endurance: 16, might: 1, hate: 4, parry: 1, armour: 1,
    profs: [
      { name: "Fiery Touch (Fiery Blow)", rating: 3, damage: 2, injury: 12, special: "Fiery Blow" }
    ],
    fellAbilities: [
      { name: "Flame of Udûn", desc: "When hit in close combat, that hero suffers moderate fire Endurance loss." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Ghastly Wings", desc: "Can attack any player-hero, in any stance, including Rearward." },
      { name: "Wind-like Speed", desc: "All attack rolls against the creature are Ill-favoured." }
    ]
  },

  // Monsters & Nameless Things
  {
    name: "Marrow-eater",
    category: "Monsters & Nameless Things",
    features: "Lithe, Stealthy",
    attributeLevel: 4, endurance: 30, might: 1, hate: 4, parry: 1, armour: 1,
    profs: [
      { name: "Obsidian Knife", rating: 3, damage: 3, injury: 12, special: "Pierce" },
      { name: "Sticky Fingers", rating: 3, damage: 1, injury: 10, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Hideous Toughness", desc: "When reduced to 0 Endurance, causes a Piercing Blow; resets to half max." },
      { name: "Poison", desc: "If an attack Wounds, target is also poisoned." },
      { name: "Thick Hide", desc: "Spend 1 Hate to gain (+2d) on a Protection roll." }
    ]
  },
  {
    name: "Doom of Nenuial",
    category: "Monsters & Nameless Things",
    features: "Cunning, Territorial",
    attributeLevel: 10, endurance: 100, might: 3, hate: 10, parry: 1, armour: 4,
    profs: [
      { name: "Bite", rating: 3, damage: 8, injury: 14, special: "Pierce" },
      { name: "Tail", rating: 3, damage: 6, injury: 12, special: "Break Shield" }
    ],
    fellAbilities: [
      { name: "Aquatic", desc: "All rolls Ill-favoured while on land." },
      { name: "Denizen of the Dark", desc: "All rolls Favoured in darkness." },
      { name: "Fear of Fire", desc: "Loses 1 Hate each round engaged with a burning item." },
      { name: "Hate Sunlight", desc: "Loses 1 Hate per round in full sun." },
      { name: "Hideous Toughness", desc: "When reduced to 0, causes a Piercing Blow; returns to full Endurance." },
      { name: "Snake-like Speed", desc: "Spend 1 Hate to make attacks against it Ill-favoured (in water only)." }
    ]
  },

  // Named Villains
  {
    name: "Búrzgul (Orc Chieftain)",
    category: "Named Villains",
    features: "Cruel, Keen-eyed",
    attributeLevel: 5, endurance: 22, might: 1, hate: 5, parry: 3, armour: 3,
    profs: [
      { name: "Scimitar", rating: 3, damage: 3, injury: 12, special: "Break Shield" },
      { name: "Spear", rating: 2, damage: 3, injury: 18, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Orc-poison", desc: "On a Wound, target is also poisoned." },
      { name: "Snake-like Speed", desc: "Spend 1 Hate to make attacks against it Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to all other Orcs." }
    ]
  },
  {
    name: "Ash (Búrzgul's Warg)",
    category: "Named Villains",
    features: "Cunning, Swift",
    attributeLevel: 4, endurance: 20, might: 1, hate: 4, parry: 2, armour: 1,
    profs: [
      { name: "Fangs", rating: 3, damage: 8, injury: 18, special: "Pierce" },
      { name: "Claws", rating: 2, damage: 5, injury: 18, special: "Seize" }
    ],
    fellAbilities: [
      { name: "Fear of Fire", desc: "Loses 1 Warg Hate engaged with fire." },
      { name: "Savage Assault", desc: "Spend 1 Hate after a Fangs attack to immediately roll a Claws attack." }
    ]
  },
  {
    name: "Usapthon (Sorceress)",
    category: "Named Villains",
    features: "Secretive, Unsettling",
    attributeLevel: 7, endurance: 28, might: 2, hate: 7, parry: 3, armour: 2,
    profs: [
      { name: "Club", rating: 3, damage: 4, injury: 14, special: "Pierce" },
      { name: "Dagger", rating: 3, damage: 2, injury: 12, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Combat Sorcerer", desc: "Can cast a Dreadful Spell in place of one attack without spending Hate." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Dreadful Spells: Lure", desc: "Spend 1 Hate to force 3 Shadow (Sorcery); fail = Bout of Madness." },
      { name: "Dreadful Spells: Misfortune", desc: "Curses foes with ill fortune." }
    ]
  },
  {
    name: "Tembur, Forgoil-bane",
    category: "Named Villains",
    features: "Cruel, Fierce",
    attributeLevel: 5, endurance: 20, might: 2, resolve: 5, parry: 2, armour: 3,
    profs: [
      { name: "Rune-scored Spear", rating: 3, damage: 5, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Fierce", desc: "Spend 1 Resolve to gain (+1d) and make the attack roll Favoured." },
      { name: "Hatred (Rohirrim)", desc: "All attacks against Rohirrim are Favoured." },
      { name: "Hideous Toughness", desc: "When reduced to 0, causes a Piercing Blow; returns to full Endurance." }
    ]
  },
  {
    name: "Eater of Ghosts",
    category: "Named Villains",
    features: "Fey, Wicked",
    attributeLevel: 5, endurance: 20, might: 2, resolve: 5, parry: 3, armour: 2,
    profs: [
      { name: "Spear", rating: 3, damage: 3, injury: 14, special: "Pierce" },
      { name: "Long-hafted Axe", rating: 3, damage: 6, injury: 18, special: "Break Shield" }
    ],
    fellAbilities: [
      { name: "Fierce", desc: "Spend 1 Resolve to gain (+1d) and make the roll Favoured." }
    ]
  },
  {
    name: "Radgul of Mount Gram",
    category: "Named Villains",
    features: "Vengeful, Wily",
    attributeLevel: 6, endurance: 24, might: 2, hate: 6, parry: 3, armour: 3,
    profs: [
      { name: "Orc-axe", rating: 3, damage: 6, injury: 18, special: "Break Shield" },
      { name: "Spear", rating: 3, damage: 3, injury: 14, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Great Leap", desc: "Spend 1 Hate to attack any hero, in any stance, including Rearward." },
      { name: "Hatred (Hobbits)", desc: "When fighting Hobbits, all rolls are Favoured." },
      { name: "Hideous Toughness", desc: "When reduced to 0, causes a Piercing Blow; returns to full Endurance." },
      { name: "Snake-like Speed", desc: "Spend 1 Hate to make attacks against it Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to other Orcs." }
    ]
  },
  {
    name: "Zoril (Black Númenórean)",
    category: "Named Villains",
    features: "Proud, Merciless",
    attributeLevel: 7, endurance: 28, might: 2, hate: 7, parry: 4, armour: 4,
    profs: [
      { name: "The Blade Magolach", rating: 4, damage: 6, injury: 18, special: "Fiery Blow" },
      { name: "Great Bow", rating: 3, damage: 4, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Fearless", desc: "Might considered +1 higher for resisting Intimidate Foe." },
      { name: "Snake-like Speed", desc: "Spend 1 Hate to force Ill-Favoured attack rolls." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate or Resolve to all allies." }
    ]
  },
  {
    name: "Malech One-eye",
    category: "Named Villains",
    features: "Cunning, Fearful",
    attributeLevel: 7, endurance: 40, might: 2, hate: 7, parry: 4, armour: 4,
    profs: [
      { name: "Broad-headed Spear", rating: 3, damage: 5, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Craven", desc: "When affected by Intimidate Foe, Malech also loses 1 Hate." },
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Hideous Toughness", desc: "When reduced to 0, causes a Piercing Blow; resets to half max." },
      { name: "Snake-like Speed", desc: "Spend 1 Hate to make player attacks Ill-favoured." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to other Orcs." }
    ]
  },
  {
    name: "Thu the Firespeaker",
    category: "Named Villains",
    features: "Faithful, Secretive",
    attributeLevel: 7, endurance: 28, might: 2, hate: 7, parry: 1, armour: 4,
    profs: [
      { name: "Torch-staff (Fiery Blow)", rating: 3, damage: 4, injury: 14, special: "Fiery Blow" }
    ],
    fellAbilities: [
      { name: "Denizen of the Dark", desc: "Attack rolls are Favoured in darkness." },
      { name: "Dreadful Spells", desc: "Spend 2 Hate to force 1 Shadow (Sorcery); fail = burst into flame." },
      { name: "Heartless", desc: "Not affected by Intimidate Foe unless a Magical success is obtained." },
      { name: "Hideous Toughness", desc: "When reduced to 0, causes a Piercing Blow; resets to half max." },
      { name: "Strike Fear", desc: "Spend 2 Hate to make all heroes gain 2 Shadow (Dread)." }
    ]
  },
  {
    name: "Har, Would-be Lord",
    category: "Named Villains",
    features: "Clever, Corrupt",
    attributeLevel: 6, endurance: 40, might: 2, hate: 6, parry: 2, armour: 4,
    profs: [
      { name: "Battle Axe", rating: 3, damage: 6, injury: 16, special: "Break Shield" }
    ],
    fellAbilities: [
      { name: "Fearless", desc: "Might considered +1 higher for resisting Intimidate Foe." },
      { name: "Hatred (Elves and Dúnedain)", desc: "When targeting Elves/Dúnedain, attacks are Favoured." },
      { name: "Lesser Ring of Power", desc: "Spend 1 Hate to cancel a player's skill success." }
    ]
  },
  {
    name: "Naglur, Sword of Sauron",
    category: "Named Villains",
    features: "Arrogant, Fierce",
    attributeLevel: 7, endurance: 40, might: 2, hate: 7, parry: 4, armour: 4,
    profs: [
      { name: "Broad-bladed Sword", rating: 3, damage: 4, injury: 16, special: "Pierce" }
    ],
    fellAbilities: [
      { name: "Horrible Strength", desc: "On a Piercing Blow in close combat, spend 1 Hate to make target's Protection roll Ill-favoured." },
      { name: "Thick Armour", desc: "Spend 1 Hate to gain (+1d) on a Protection roll." },
      { name: "Yell of Triumph", desc: "Spend 1 Hate to restore 1 Hate to other Orcs." }
    ]
  }
];
function loremasterFoeToEncounter(a) {
  const fell = [a.features, ...((a.fellAbilities || []).map(f => f.name + ': ' + f.desc))].filter(Boolean).join(' · ');
  return {
    name: a.name, source: a.category || 'Adversary',
    end: a.endurance || 0, might: a.might || 0, hate: (a.hate != null ? a.hate : (a.resolve || 0)),
    parry: a.parry || 0, armour: a.armour || 0, atkTN: 10 + (a.attributeLevel || 0),
    attacks: (a.profs || []).map(p => ({ name: p.name, dice: p.rating || 0, dmg: p.damage || 0, inj: p.injury || 0, special: p.special || '' })),
    fell
  };
}
// Unified picker source: the original curated 18 + the ported 44 (adapted), de-duped by name (original wins).
function allBestiary() {
  const seen = new Set(BESTIARY.map(b => b.name));
  return BESTIARY.concat(ADVERSARY_DB.filter(a => !seen.has(a.name)).map(loremasterFoeToEncounter));
}


const PREGENS = [
 {
  "id": "geira",
  "name": "Geira, daughter of Gautarr",
  "src": "Player Heroes",
  "culture": "Bardings",
  "blessing": "Stout-Hearted — All Valour rolls are Favoured",
  "calling": "Captain",
  "shadowPath": "Lure of Power",
  "patron": "Gilraen, daughter of Dírhael",
  "standard": "Prosperous",
  "age": "25",
  "features": "Bold, Proud, Leadership",
  "strRating": 5,
  "strTN": 15,
  "hrtRating": 5,
  "hrtTN": 15,
  "witRating": 4,
  "witTN": 16,
  "endMax": 27,
  "hopeMax": 13,
  "parry": 16,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 2,
    "favoured": false
   },
   "Athletics": {
    "rating": 2,
    "favoured": false
   },
   "Awareness": {
    "rating": 0,
    "favoured": false
   },
   "Hunting": {
    "rating": 2,
    "favoured": false
   },
   "Song": {
    "rating": 1,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 2,
    "favoured": true
   },
   "Travel": {
    "rating": 1,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 0,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": false
   },
   "Battle": {
    "rating": 2,
    "favoured": true
   },
   "Persuade": {
    "rating": 3,
    "favoured": true
   },
   "Stealth": {
    "rating": 0,
    "favoured": false
   },
   "Scan": {
    "rating": 1,
    "favoured": false
   },
   "Explore": {
    "rating": 1,
    "favoured": false
   },
   "Riddle": {
    "rating": 0,
    "favoured": false
   },
   "Lore": {
    "rating": 1,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 0,
   "Spears": 1,
   "Swords": 3
  },
  "weapons": [
   {
    "name": "Sword",
    "dmg": "4",
    "inj": "16",
    "load": "2",
    "prof": "Swords",
    "notes": "",
    "picked": true,
    "rewards": []
   },
   {
    "name": "Short Spear",
    "dmg": "3",
    "inj": "14",
    "load": "2",
    "prof": "Spears",
    "notes": "Can be thrown",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 4,
  "armourLoad": 10,
  "armourNotes": "Coat of Mail",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 1,
  "shieldTotal": 1,
  "shieldLoad": 2,
  "shieldNotes": "Buckler",
  "rewardsList": [
   {
    "name": "Cunning Make",
    "type": "Armour/Helm/Shield",
    "desc": "Reduce Load rating by 2 (min 0)",
    "appliedTo": "Coat of Mail"
   }
  ],
  "virtuesList": [
   {
    "name": "Hardiness",
    "desc": "Raise max Endurance by 2 (or by Wisdom rating, whichever higher)"
   }
  ],
  "usefulItems": [
   {
    "name": "Dwarven Knife",
    "skill": "Hunting",
    "desc": ""
   },
   {
    "name": "Fur Cloak",
    "skill": "Travel",
    "desc": ""
   },
   {
    "name": "Golden Brooch",
    "skill": "Courtesy",
    "desc": ""
   }
  ],
  "armourRewards": [
   "Cunning Make"
  ],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "regin",
  "name": "Regin Stonefist",
  "src": "Player Heroes",
  "culture": "Dwarves of Durin's Folk",
  "blessing": "Redoubtable — Halve Load of armour & helms",
  "calling": "Champion",
  "shadowPath": "Curse of Vengeance",
  "patron": "Gilraen, daughter of Dírhael",
  "standard": "Prosperous",
  "age": "76",
  "features": "Fierce, Wilful, Enemy-Lore (Orcs)",
  "strRating": 7,
  "strTN": 13,
  "hrtRating": 2,
  "hrtTN": 17,
  "witRating": 5,
  "witTN": 15,
  "endMax": 29,
  "hopeMax": 10,
  "parry": 15,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 2,
    "favoured": true
   },
   "Athletics": {
    "rating": 2,
    "favoured": true
   },
   "Awareness": {
    "rating": 0,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 1,
    "favoured": false
   },
   "Craft": {
    "rating": 2,
    "favoured": true
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 3,
    "favoured": false
   },
   "Insight": {
    "rating": 0,
    "favoured": false
   },
   "Healing": {
    "rating": 0,
    "favoured": false
   },
   "Courtesy": {
    "rating": 1,
    "favoured": false
   },
   "Battle": {
    "rating": 2,
    "favoured": false
   },
   "Persuade": {
    "rating": 0,
    "favoured": false
   },
   "Stealth": {
    "rating": 0,
    "favoured": false
   },
   "Scan": {
    "rating": 3,
    "favoured": false
   },
   "Explore": {
    "rating": 2,
    "favoured": false
   },
   "Riddle": {
    "rating": 2,
    "favoured": false
   },
   "Lore": {
    "rating": 1,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 3,
   "Bows": 0,
   "Spears": 1,
   "Swords": 0
  },
  "weapons": [
   {
    "name": "Long-hafted Axe",
    "dmg": "6",
    "inj": "18",
    "load": "3",
    "prof": "Axes",
    "notes": "Injury 20 when used 2-handed",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 4,
  "armourLoad": 6,
  "armourNotes": "Coat of Mail",
  "helmProt": 1,
  "helmLoad": 2,
  "shieldBase": 3,
  "shieldTotal": 3,
  "shieldLoad": 4,
  "shieldNotes": "Shield",
  "rewardsList": [
   {
    "name": "Reinforced",
    "type": "Shield",
    "desc": "Add 1 to shield Parry bonus",
    "appliedTo": "Shield"
   }
  ],
  "virtuesList": [
   {
    "name": "Prowess",
    "desc": "Lower one Attribute TN by 1"
   }
  ],
  "usefulItems": [
   {
    "name": "Carved Pauldrons",
    "skill": "Battle",
    "desc": ""
   },
   {
    "name": "Padded Boots",
    "skill": "Stealth",
    "desc": ""
   },
   {
    "name": "Wanderer's Haversack",
    "skill": "Explore",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [
   "Reinforced"
  ],
  "helmRewards": [],
  "prowessAttr": "hrt"
 },
 {
  "id": "fimbrethil",
  "name": "Fimbrethil of the Havens",
  "src": "Player Heroes",
  "culture": "Elves of Lindon",
  "blessing": "Elven-Skill",
  "calling": "Scholar",
  "shadowPath": "Lure of Secrets",
  "patron": "Gilraen, daughter of Dírhael",
  "standard": "Frugal",
  "age": "135",
  "features": "Fair, Lordly, Rhymes of Lore",
  "strRating": 4,
  "strTN": 16,
  "hrtRating": 3,
  "hrtTN": 17,
  "witRating": 7,
  "witTN": 13,
  "endMax": 24,
  "hopeMax": 13,
  "parry": 19,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 2,
    "favoured": false
   },
   "Athletics": {
    "rating": 2,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": true
   },
   "Craft": {
    "rating": 2,
    "favoured": false
   },
   "Enhearten": {
    "rating": 1,
    "favoured": false
   },
   "Travel": {
    "rating": 2,
    "favoured": false
   },
   "Insight": {
    "rating": 0,
    "favoured": false
   },
   "Healing": {
    "rating": 3,
    "favoured": false
   },
   "Courtesy": {
    "rating": 1,
    "favoured": false
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 0,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": false
   },
   "Scan": {
    "rating": 1,
    "favoured": false
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 1,
    "favoured": true
   },
   "Lore": {
    "rating": 3,
    "favoured": true
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 2,
   "Spears": 1,
   "Swords": 0
  },
  "weapons": [
   {
    "name": "Great Bow",
    "dmg": "4",
    "inj": "18",
    "load": "4",
    "prof": "Bows",
    "notes": "Ranged, 2-handed",
    "picked": true,
    "rewards": [
     "Fell"
    ]
   },
   {
    "name": "Cudgel",
    "dmg": "3",
    "inj": "12",
    "load": "0",
    "prof": "Brawling",
    "notes": "Brawling",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 2,
  "armourLoad": 6,
  "armourNotes": "Leather Corslet",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [
   {
    "name": "Fell",
    "type": "Weapon",
    "desc": "Add 2 to Injury rating",
    "appliedTo": "Great Bow"
   }
  ],
  "virtuesList": [
   {
    "name": "Confidence",
    "desc": "Raise max Hope by 2"
   }
  ],
  "usefulItems": [
   {
    "name": "Harp",
    "skill": "Song",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "mentha",
  "name": "Mentha North-Tooks",
  "src": "Player Heroes",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "Treasure Hunter",
  "shadowPath": "Dragon-Sickness",
  "patron": "Gilraen, daughter of Dírhael",
  "standard": "Common",
  "age": "29",
  "features": "Eager, Inquisitive, Burglar",
  "strRating": 2,
  "strTN": 18,
  "hrtRating": 6,
  "hrtTN": 14,
  "witRating": 6,
  "witTN": 14,
  "endMax": 20,
  "hopeMax": 16,
  "parry": 18,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": true
   },
   "Awareness": {
    "rating": 3,
    "favoured": true
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 1,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": false
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": true
   },
   "Scan": {
    "rating": 1,
    "favoured": true
   },
   "Explore": {
    "rating": 2,
    "favoured": true
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 1,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 1,
   "Spears": 0,
   "Swords": 2
  },
  "weapons": [
   {
    "name": "Short Sword",
    "dmg": "3",
    "inj": "16",
    "load": "1",
    "prof": "Swords",
    "notes": "Keen",
    "picked": true,
    "rewards": [
     "Keen"
    ]
   },
   {
    "name": "Bow",
    "dmg": "3",
    "inj": "14",
    "load": "2",
    "prof": "Bows",
    "notes": "Ranged, 2-handed",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 1,
  "armourLoad": 3,
  "armourNotes": "Leather Shirt",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [
   {
    "name": "Keen",
    "type": "Weapon",
    "desc": "Attack rolls score a Piercing Blow also on a Feat die result of 9+",
    "appliedTo": "Short Sword"
   }
  ],
  "virtuesList": [
   {
    "name": "Mastery",
    "desc": "Choose two Skills and make them Favoured"
   }
  ],
  "usefulItems": [
   {
    "name": "Reusable Torch",
    "skill": "Scan",
    "desc": ""
   },
   {
    "name": "Rope",
    "skill": "Athletics",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "duinhir",
  "name": "Duinhir 'Eaglenose'",
  "src": "Player Heroes",
  "culture": "Rangers of the North",
  "blessing": "Kings of Men",
  "calling": "Warden",
  "shadowPath": "Path of Despair",
  "patron": "Gilraen, daughter of Dírhael",
  "standard": "Frugal",
  "age": "30",
  "features": "Honourable, Stern, Shadow-Lore",
  "strRating": 6,
  "strTN": 14,
  "hrtRating": 5,
  "hrtTN": 15,
  "witRating": 4,
  "witTN": 16,
  "endMax": 26,
  "hopeMax": 11,
  "parry": 18,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 1,
    "favoured": false
   },
   "Athletics": {
    "rating": 2,
    "favoured": true
   },
   "Awareness": {
    "rating": 2,
    "favoured": true
   },
   "Hunting": {
    "rating": 2,
    "favoured": true
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 2,
    "favoured": false
   },
   "Insight": {
    "rating": 0,
    "favoured": false
   },
   "Healing": {
    "rating": 2,
    "favoured": true
   },
   "Courtesy": {
    "rating": 0,
    "favoured": false
   },
   "Battle": {
    "rating": 2,
    "favoured": false
   },
   "Persuade": {
    "rating": 0,
    "favoured": false
   },
   "Stealth": {
    "rating": 2,
    "favoured": false
   },
   "Scan": {
    "rating": 1,
    "favoured": false
   },
   "Explore": {
    "rating": 3,
    "favoured": false
   },
   "Riddle": {
    "rating": 0,
    "favoured": false
   },
   "Lore": {
    "rating": 2,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 0,
   "Spears": 1,
   "Swords": 3
  },
  "weapons": [
   {
    "name": "Long Sword",
    "dmg": "6",
    "inj": "16",
    "load": "3",
    "prof": "Swords",
    "notes": "Injury 18 when used 2-handed",
    "picked": true,
    "rewards": [
     "Grievous"
    ]
   },
   {
    "name": "Spear",
    "dmg": "4",
    "inj": "14",
    "load": "3",
    "prof": "Spears",
    "notes": "Injury 16 2-h, can be thrown",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 1,
  "armourLoad": 3,
  "armourNotes": "Leather Shirt",
  "helmProt": 1,
  "helmLoad": 4,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [
   {
    "name": "Grievous",
    "type": "Weapon",
    "desc": "Add 1 to Damage rating",
    "appliedTo": "Long Sword"
   }
  ],
  "virtuesList": [
   {
    "name": "Dour-handed",
    "desc": "Heavy Blow: +1 Strength damage; Pierce: +1 Feat Die"
   }
  ],
  "usefulItems": [
   {
    "name": "Hatchet",
    "skill": "Craft",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "drogo",
  "name": "Drogo Baggins",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "52",
  "features": "Faithful, Honourable",
  "strRating": 3,
  "strTN": 15,
  "hrtRating": 6,
  "hrtTN": 12,
  "witRating": 5,
  "witTN": 13,
  "endMax": 23,
  "hopeMax": 18,
  "parry": 17,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 0,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": true
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 1,
    "favoured": true
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 3,
    "favoured": true
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": false
   },
   "Scan": {
    "rating": 0,
    "favoured": false
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 1,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 2,
   "Spears": 0,
   "Swords": 1
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Confidence",
    "desc": "Raise max Hope by 2"
   }
  ],
  "usefulItems": [
   {
    "name": "Fine Cloak and Hat",
    "skill": "Awe",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "esmeralda",
  "name": "Esmeralda Took",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "24",
  "features": "Eager, Merry",
  "strRating": 2,
  "strTN": 15,
  "hrtRating": 7,
  "hrtTN": 11,
  "witRating": 5,
  "witTN": 13,
  "endMax": 22,
  "hopeMax": 17,
  "parry": 17,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 1,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 2,
    "favoured": true
   },
   "Travel": {
    "rating": 0,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": true
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": true
   },
   "Stealth": {
    "rating": 3,
    "favoured": false
   },
   "Scan": {
    "rating": 0,
    "favoured": false
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 0,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 1,
   "Bows": 2,
   "Spears": 0,
   "Swords": 0
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Prowess",
    "desc": "Lower one Attribute TN by 1"
   }
  ],
  "usefulItems": [
   {
    "name": "Tookish Walking Stick",
    "skill": "Travel",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": [],
  "prowessAttr": "str"
 },
 {
  "id": "lobelia",
  "name": "Lobelia Bracegirdle",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "42",
  "features": "Inquisitive, Keen-eyed",
  "strRating": 2,
  "strTN": 16,
  "hrtRating": 6,
  "hrtTN": 12,
  "witRating": 6,
  "witTN": 12,
  "endMax": 22,
  "hopeMax": 16,
  "parry": 18,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 2,
    "favoured": true
   },
   "Athletics": {
    "rating": 0,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 0,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": true
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": true
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": true
   },
   "Scan": {
    "rating": 1,
    "favoured": true
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 1,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 1,
   "Spears": 0,
   "Swords": 2
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Mastery",
    "desc": "Choose two Skills and make them Favoured"
   }
  ],
  "usefulItems": [
   {
    "name": "Exquisite Umbrella",
    "skill": "Persuade",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "paladin",
  "name": "Paladin Took II",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "27",
  "features": "Eager, Rustic",
  "strRating": 3,
  "strTN": 15,
  "hrtRating": 7,
  "hrtTN": 11,
  "witRating": 4,
  "witTN": 14,
  "endMax": 23,
  "hopeMax": 17,
  "parry": 17,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": true
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 1,
    "favoured": true
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 0,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": false
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": true
   },
   "Scan": {
    "rating": 0,
    "favoured": false
   },
   "Explore": {
    "rating": 2,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 0,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 1,
   "Bows": 0,
   "Spears": 0,
   "Swords": 2
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Nimbleness",
    "desc": "Raise Parry by 1"
   }
  ],
  "usefulItems": [
   {
    "name": "Tookish Wayfarer Bundle",
    "skill": "Explore",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "primula",
  "name": "Primula Brandybuck",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "40",
  "features": "Fair-spoken, Faithful",
  "strRating": 4,
  "strTN": 14,
  "hrtRating": 6,
  "hrtTN": 12,
  "witRating": 4,
  "witTN": 13,
  "endMax": 24,
  "hopeMax": 16,
  "parry": 16,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 0,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 0,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": false
   },
   "Healing": {
    "rating": 2,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": true
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": false
   },
   "Scan": {
    "rating": 0,
    "favoured": false
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": true
   },
   "Lore": {
    "rating": 2,
    "favoured": true
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 2,
   "Spears": 1,
   "Swords": 0
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Prowess",
    "desc": "Lower one Attribute TN by 1"
   }
  ],
  "usefulItems": [
   {
    "name": "Fancy Garments",
    "skill": "Courtesy",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": [],
  "prowessAttr": "wit"
 },
 {
  "id": "rorimac",
  "name": "Rorimac Brandybuck",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "58",
  "features": "Keen-eyed, Rustic",
  "strRating": 4,
  "strTN": 14,
  "hrtRating": 5,
  "hrtTN": 13,
  "witRating": 5,
  "witTN": 13,
  "endMax": 26,
  "hopeMax": 15,
  "parry": 17,
  "valour": 1,
  "wisdom": 1,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": true
   },
   "Hunting": {
    "rating": 2,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 0,
    "favoured": false
   },
   "Insight": {
    "rating": 2,
    "favoured": true
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": false
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": true
   },
   "Scan": {
    "rating": 1,
    "favoured": false
   },
   "Explore": {
    "rating": 0,
    "favoured": false
   },
   "Riddle": {
    "rating": 3,
    "favoured": false
   },
   "Lore": {
    "rating": 0,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 0,
   "Spears": 1,
   "Swords": 2
  },
  "weapons": [],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [],
  "virtuesList": [
   {
    "name": "Hardiness",
    "desc": "Raise max Endurance by 2 (or by Wisdom rating, whichever higher)"
   }
  ],
  "usefulItems": [
   {
    "name": "Rabbit-skinning Knife",
    "skill": "Hunting",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "balin",
  "name": "Balin, Son of Fundin",
  "src": "Shire Starter Set",
  "culture": "Dwarves of Durin's Folk",
  "blessing": "Redoubtable — Halve Load of armour & helms",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Prosperous",
  "age": "197",
  "features": "Eager, Inquisitive",
  "strRating": 5,
  "strTN": 13,
  "hrtRating": 4,
  "hrtTN": 14,
  "witRating": 5,
  "witTN": 13,
  "endMax": 27,
  "hopeMax": 12,
  "parry": 15,
  "valour": 4,
  "wisdom": 3,
  "skills": {
   "Awe": {
    "rating": 2,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 3,
    "favoured": false
   },
   "Enhearten": {
    "rating": 2,
    "favoured": false
   },
   "Travel": {
    "rating": 3,
    "favoured": true
   },
   "Insight": {
    "rating": 0,
    "favoured": false
   },
   "Healing": {
    "rating": 0,
    "favoured": false
   },
   "Courtesy": {
    "rating": 2,
    "favoured": false
   },
   "Battle": {
    "rating": 3,
    "favoured": false
   },
   "Persuade": {
    "rating": 2,
    "favoured": false
   },
   "Stealth": {
    "rating": 0,
    "favoured": false
   },
   "Scan": {
    "rating": 3,
    "favoured": true
   },
   "Explore": {
    "rating": 2,
    "favoured": true
   },
   "Riddle": {
    "rating": 2,
    "favoured": false
   },
   "Lore": {
    "rating": 3,
    "favoured": false
   }
  },
  "profs": {
   "Axes": 3,
   "Bows": 0,
   "Spears": 0,
   "Swords": 1
  },
  "weapons": [
   {
    "name": "Balin's Axe",
    "dmg": "6",
    "inj": "18",
    "load": "2",
    "prof": "Axes",
    "notes": "Grievous, Keen",
    "picked": true,
    "rewards": [
     "Grievous",
     "Keen"
    ]
   }
  ],
  "armourProt": 4,
  "armourLoad": 10,
  "armourNotes": "Coat of Silver Mail (close-fitting, cunning make)",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 2,
  "shieldTotal": 2,
  "shieldLoad": 4,
  "shieldNotes": "Shield",
  "rewardsList": [
   {
    "name": "Grievous",
    "type": "Weapon",
    "desc": "Add 1 to Damage rating",
    "appliedTo": "Balin's Axe"
   },
   {
    "name": "Keen",
    "type": "Weapon",
    "desc": "Attack rolls score a Piercing Blow also on a Feat die result of 9+",
    "appliedTo": "Balin's Axe"
   },
   {
    "name": "Close-fitting",
    "type": "Armour/Helm",
    "desc": "Add +2 to your Protection roll result while wearing it",
    "appliedTo": "Coat of Silver Mail"
   },
   {
    "name": "Cunning Make",
    "type": "Armour/Helm/Shield",
    "desc": "Reduce Load rating by 2 (min 0)",
    "appliedTo": "Coat of Silver Mail"
   }
  ],
  "virtuesList": [
   {
    "name": "Dark for Dark Business",
    "desc": "When in the dark (night/underground), Inspired on all rolls"
   },
   {
    "name": "Dour-handed",
    "desc": "Heavy Blow: +1 Strength damage; Pierce: +1 Feat Die"
   },
   {
    "name": "Durin's Way",
    "desc": "+2 Parry when fighting underground or in cramped quarters"
   }
  ],
  "usefulItems": [
   {
    "name": "Dwarf-make Viol",
    "skill": "Song",
    "desc": ""
   }
  ],
  "armourRewards": [
   "Close-fitting",
   "Cunning Make"
  ],
  "shieldRewards": [],
  "helmRewards": []
 },
 {
  "id": "bilbo",
  "name": "Bilbo Baggins",
  "src": "Shire Starter Set",
  "culture": "Hobbits of the Shire",
  "blessing": "Hobbit-Sense — All Wisdom rolls are Favoured",
  "calling": "",
  "shadowPath": "",
  "patron": "",
  "standard": "Common",
  "age": "70",
  "features": "Fair-spoken, Honourable",
  "strRating": 3,
  "strTN": 15,
  "hrtRating": 6,
  "hrtTN": 12,
  "witRating": 5,
  "witTN": 13,
  "endMax": 23,
  "hopeMax": 16,
  "parry": 17,
  "valour": 2,
  "wisdom": 3,
  "skills": {
   "Awe": {
    "rating": 0,
    "favoured": false
   },
   "Athletics": {
    "rating": 1,
    "favoured": false
   },
   "Awareness": {
    "rating": 2,
    "favoured": false
   },
   "Hunting": {
    "rating": 0,
    "favoured": false
   },
   "Song": {
    "rating": 2,
    "favoured": false
   },
   "Craft": {
    "rating": 1,
    "favoured": false
   },
   "Enhearten": {
    "rating": 0,
    "favoured": false
   },
   "Travel": {
    "rating": 2,
    "favoured": false
   },
   "Insight": {
    "rating": 3,
    "favoured": false
   },
   "Healing": {
    "rating": 1,
    "favoured": false
   },
   "Courtesy": {
    "rating": 3,
    "favoured": true
   },
   "Battle": {
    "rating": 0,
    "favoured": false
   },
   "Persuade": {
    "rating": 3,
    "favoured": false
   },
   "Stealth": {
    "rating": 3,
    "favoured": false
   },
   "Scan": {
    "rating": 2,
    "favoured": true
   },
   "Explore": {
    "rating": 1,
    "favoured": true
   },
   "Riddle": {
    "rating": 3,
    "favoured": true
   },
   "Lore": {
    "rating": 2,
    "favoured": true
   }
  },
  "profs": {
   "Axes": 0,
   "Bows": 2,
   "Spears": 0,
   "Swords": 2
  },
  "weapons": [
   {
    "name": "Sting",
    "dmg": "3",
    "inj": "20",
    "load": "1",
    "prof": "Swords",
    "notes": "Elven blade — glows when Orcs are near",
    "picked": true,
    "rewards": [
     "Keen"
    ]
   },
   {
    "name": "Thrown rocks",
    "dmg": "1",
    "inj": "12",
    "load": "0",
    "prof": "Brawling",
    "notes": "Brawling",
    "picked": true,
    "rewards": []
   }
  ],
  "armourProt": 0,
  "armourLoad": 0,
  "armourNotes": "",
  "helmProt": 0,
  "helmLoad": 0,
  "shieldBase": 0,
  "shieldTotal": 0,
  "shieldLoad": 0,
  "shieldNotes": "",
  "rewardsList": [
   {
    "name": "Keen",
    "type": "Weapon",
    "desc": "Attack rolls score a Piercing Blow also on a Feat die result of 9+",
    "appliedTo": "Sting"
   }
  ],
  "virtuesList": [
   {
    "name": "Brave at a Pinch",
    "desc": "When Miserable, Weary, or Wounded: Inspired on all rolls"
   },
   {
    "name": "Mastery",
    "desc": "Choose two Skills and make them Favoured"
   },
   {
    "name": "Sure at the Mark",
    "desc": "All ranged attacks Favoured. Thrown stones: Piercing Blow on Rune, Injury 12"
   }
  ],
  "usefulItems": [
   {
    "name": "Bilbo's Magic Ring",
    "skill": "",
    "desc": ""
   },
   {
    "name": "Finely-wrought Pipe",
    "skill": "Insight",
    "desc": ""
   }
  ],
  "armourRewards": [],
  "shieldRewards": [],
  "helmRewards": []
 }
];

// Brawling is a derived proficiency: highest other prof rank − 1 (Core Rules p.45).
// Used for Unarmed / Dagger / Cudgel / Club. Not stored on char.profs.
function getBrawlingRating() {
  const rolled = COMBAT_PROFS.map(p => parseInt(char.profs?.[p]) || 0);
  const max = Math.max(0, ...rolled);
  return Math.max(0, max - 1);
}

const CULTURES = {
  'Bardings': {
    blessing: 'Stout-Hearted — All Valour rolls are Favoured',
    standard: 'Prosperous',
    age: '18-40',
    endBonus: 20, hopeBonus: 8, parryBonus: 12,
    weapons: '',
    attrSets: [[5,7,2],[4,7,3],[5,6,3],[4,6,4],[5,5,4],[6,6,2]],
    skills: {Awe:1,Enhearten:2,Persuade:3,Athletics:1,Travel:1,Stealth:0,Awareness:0,Insight:2,Scan:1,Hunting:2,Healing:0,Explore:1,Song:1,Courtesy:2,Riddle:0,Craft:1,Battle:2,Lore:1},
    favouredChoice: ['Enhearten','Athletics'],
    profPrimary: ['Bows','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Bold, Eager, Fair, Fierce, Generous, Proud, Tall, Wilful'
  },
  "Dwarves of Durin's Folk": {
    blessing: 'Redoubtable — Halve Load of armour & helms (round up); shields unaffected',
    standard: 'Prosperous',
    age: '50-100',
    endBonus: 22, hopeBonus: 8, parryBonus: 10,
    weapons: 'Cannot use great bow, great spear, or great shield',
    attrSets: [[7,2,5],[7,3,4],[6,3,5],[6,4,4],[5,4,5],[6,2,6]],
    skills: {Awe:2,Enhearten:0,Persuade:0,Athletics:1,Travel:3,Stealth:0,Awareness:0,Insight:0,Scan:3,Hunting:0,Healing:0,Explore:2,Song:1,Courtesy:1,Riddle:2,Craft:2,Battle:1,Lore:1},
    favouredChoice: ['Travel','Craft'],
    profPrimary: ['Axes','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Cunning, Fierce, Lordly, Proud, Secretive, Stern, Wary, Wilful'
  },
  'Elves of Lindon': {
    blessing: 'Elven-Skill — Spend 1 Hope for Magical Success on Skills with ≥1 rank (if not Miserable). Weakness: max 1 Shadow removed per Fellowship Phase',
    standard: 'Frugal',
    age: '100-500',
    endBonus: 20, hopeBonus: 8, parryBonus: 12,
    weapons: '',
    attrSets: [[5,2,7],[4,3,7],[5,3,6],[4,4,6],[5,4,5],[6,2,6]],
    skills: {Awe:2,Enhearten:1,Persuade:0,Athletics:2,Travel:0,Stealth:3,Awareness:2,Insight:0,Scan:0,Hunting:0,Healing:1,Explore:0,Song:2,Courtesy:0,Riddle:0,Craft:2,Battle:0,Lore:3},
    favouredChoice: ['Song','Lore'],
    profPrimary: ['Bows','Spears'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Fair, Keen-eyed, Lordly, Merry, Patient, Subtle, Swift, Wary'
  },
  'Hobbits of the Shire': {
    blessing: 'Hobbit-Sense — Wisdom rolls Favoured; +1d on Shadow Tests vs Greed',
    standard: 'Common',
    age: '25-60',
    endBonus: 18, hopeBonus: 10, parryBonus: 12,
    weapons: 'Only axe, bow, club, cudgel, dagger, short sword, short spear, spear; no great shield',
    attrSets: [[3,6,5],[3,7,4],[2,7,5],[4,6,4],[4,5,5],[2,6,6]],
    skills: {Awe:0,Enhearten:0,Persuade:2,Athletics:0,Travel:0,Stealth:3,Awareness:2,Insight:2,Scan:0,Hunting:0,Healing:1,Explore:0,Song:2,Courtesy:2,Riddle:3,Craft:1,Battle:0,Lore:0},
    favouredChoice: ['Stealth','Courtesy'],
    profPrimary: ['Bows','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Eager, Fair-spoken, Faithful, Honourable, Inquisitive, Keen-eyed, Merry, Rustic'
  },
  'Men of Bree': {
    blessing: 'Bree-Blood — Each Man of Bree in the Company adds +1 to Fellowship Rating',
    standard: 'Common',
    age: '16-40',
    endBonus: 20, hopeBonus: 10, parryBonus: 10,
    weapons: '',
    attrSets: [[2,5,7],[3,4,7],[3,5,6],[4,4,6],[4,5,5],[2,6,6]],
    skills: {Awe:0,Enhearten:2,Persuade:2,Athletics:1,Travel:1,Stealth:1,Awareness:1,Insight:2,Scan:1,Hunting:1,Healing:0,Explore:1,Song:1,Courtesy:3,Riddle:2,Craft:2,Battle:0,Lore:0},
    favouredChoice: ['Insight','Riddle'],
    profPrimary: ['Axes','Spears'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Cunning, Fair-spoken, Faithful, Generous, Inquisitive, Patient, Rustic, True-hearted'
  },
  'Rangers of the North': {
    blessing: 'Kings of Men — Add +1 to one Attribute. Weakness: only ½ Heart Hope recovered during Fellowship Phase (not Yule)',
    standard: 'Frugal',
    age: '20-50',
    endBonus: 20, hopeBonus: 6, parryBonus: 14,
    weapons: '',
    attrSets: [[7,5,2],[7,4,3],[6,5,3],[6,4,4],[5,5,4],[6,6,2]],
    skills: {Awe:1,Enhearten:0,Persuade:0,Athletics:2,Travel:2,Stealth:2,Awareness:2,Insight:0,Scan:1,Hunting:2,Healing:2,Explore:2,Song:0,Courtesy:0,Riddle:0,Craft:0,Battle:2,Lore:2},
    favouredChoice: ['Hunting','Lore'],
    profPrimary: ['Spears','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Bold, Honourable, Secretive, Stern, Subtle, Swift, Tall, True-hearted'
  },
  // === Peoples of Wilderland supplement ===
  'Beornings': {
    blessing: 'Furious — When Wounded, all Attack rolls and Protection rolls are Favoured',
    standard: 'Common',
    age: '14-40',
    endBonus: 22, hopeBonus: 6, parryBonus: 12,
    weapons: '',
    attrSets: [[5,7,2],[4,7,3],[5,6,3],[4,6,4],[5,5,4],[6,6,2]],
    skills: {Awe:3,Enhearten:1,Persuade:0,Athletics:2,Travel:1,Stealth:1,Awareness:2,Insight:3,Scan:1,Hunting:2,Healing:1,Explore:0,Song:0,Courtesy:0,Riddle:1,Craft:1,Battle:1,Lore:0},
    favouredChoice: ['Athletics','Scan'],
    profPrimary: ['Axes','Spears'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Bold, Fierce, Generous, Honourable, Rustic, Stern, Tall, Wary'
  },
  'Elves of Mirkwood': {
    blessing: 'Folk of the Dusk — When in a forest or at night, spend 1 Hope to achieve a Magical Success on a skill roll',
    standard: 'Frugal',
    age: '100-500',
    endBonus: 18, hopeBonus: 8, parryBonus: 14,
    weapons: '',
    attrSets: [[5,2,7],[4,3,7],[5,3,6],[4,4,6],[5,4,5],[6,2,6]],
    skills: {Awe:1,Enhearten:0,Persuade:0,Athletics:2,Travel:0,Stealth:3,Awareness:2,Insight:0,Scan:2,Hunting:2,Healing:1,Explore:1,Song:2,Courtesy:0,Riddle:0,Craft:1,Battle:1,Lore:2},
    favouredChoice: ['Stealth','Awareness'],
    profPrimary: ['Bows','Spears'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Cunning, Fair, Fierce, Keen-eyed, Merry, Proud, Secretive, Swift'
  },
  'Woodmen of Wilderland': {
    blessing: 'Wood-goer — Add +2 to your Parry rating when fighting in a forest',
    standard: 'Frugal',
    age: '16-40',
    endBonus: 22, hopeBonus: 8, parryBonus: 10,
    weapons: '',
    attrSets: [[2,5,7],[3,4,7],[3,5,6],[4,4,6],[4,5,5],[2,6,6]],
    skills: {Awe:0,Enhearten:1,Persuade:0,Athletics:2,Travel:0,Stealth:2,Awareness:3,Insight:0,Scan:0,Hunting:3,Healing:2,Explore:2,Song:1,Courtesy:0,Riddle:1,Craft:1,Battle:1,Lore:0},
    favouredChoice: ['Hunting','Healing'],
    profPrimary: ['Axes','Bows'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Cunning, Eager, Faithful, Patient, Stern, Swift, True-hearted, Wary'
  },
  // === Other Cultures (Dwarves of Nogrod & Belegost / High Elves of Rivendell) ===
  'Dwarves of Nogrod and Belegost': {
    blessing: 'Redoubtable — Halve Load of armour & helms (round up); shields unaffected. Petty-Dwarves: Fellowship Focus must be another Dwarf',
    standard: 'Common',
    age: '50-100',
    endBonus: 22, hopeBonus: 8, parryBonus: 10,
    weapons: 'Cannot use great bow, great spear, or great shield',
    attrSets: [[7,2,5],[7,3,4],[6,3,5],[6,4,4],[5,4,5],[6,2,6]],
    skills: {Awe:2,Enhearten:0,Persuade:0,Athletics:1,Travel:2,Stealth:0,Awareness:0,Insight:0,Scan:3,Hunting:0,Healing:0,Explore:2,Song:1,Courtesy:0,Riddle:2,Craft:3,Battle:0,Lore:2},
    favouredChoice: ['Awe','Craft'],
    profPrimary: ['Axes','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Cunning, Fierce, Proud, Rustic, Secretive, Stern, Wary, Wilful'
  },
  'High Elves of Rivendell': {
    blessing: 'Elven-wise — Spend 1 Hope for a Magical Success on a skill roll (if not Miserable); +1 to one Attribute. Beset by Woe: remove Shadow only during a Yule Fellowship Phase',
    standard: 'Prosperous',
    age: '100-3000',
    endBonus: 22, hopeBonus: 6, parryBonus: 12,
    weapons: '',
    attrSets: [[5,2,7],[4,3,7],[5,3,6],[4,4,6],[5,4,5],[6,2,6]],
    skills: {Awe:2,Enhearten:0,Persuade:0,Athletics:2,Travel:1,Stealth:0,Awareness:2,Insight:0,Scan:0,Hunting:0,Healing:2,Explore:0,Song:2,Courtesy:1,Riddle:0,Craft:2,Battle:2,Lore:3},
    favouredChoice: ['Awareness','Healing'],
    profPrimary: ['Spears','Swords'], profPrimaryRank: 2, profSecondaryRank: 1,
    features: 'Fair, Keen-eyed, Lordly, Inquisitive, Merry, Proud, Subtle, Wilful'
  }
};

const ARMOURS = [
  { name: 'Leather Shirt', prot: 1, load: 3, type: 'Leather armour', min: '' },
  { name: 'Leather Corslet', prot: 2, load: 6, type: 'Leather armour', min: '' },
  { name: 'Mail-shirt', prot: 3, load: 9, type: 'Mail armour', min: 'Common' },
  { name: 'Coat of Mail', prot: 4, load: 12, type: 'Mail armour', min: 'Prosperous' }
];

const SHIELDS = [
  { name: 'Buckler', parry: 1, load: 2, min: '' },
  { name: 'Shield', parry: 2, load: 4, min: 'Common' },
  { name: 'Great Shield', parry: 3, load: 6, min: 'Prosperous' }
];

const WEAPONS = [
  { name: 'Unarmed', dmg: 1, inj: '—', load: 0, prof: 'Brawling', notes: 'No Piercing Blow' },
  { name: 'Dagger', dmg: 2, inj: 14, load: 0, prof: 'Brawling', notes: 'Pierces like Sword' },
  { name: 'Cudgel', dmg: 3, inj: 12, load: 0, prof: 'Brawling', notes: '' },
  { name: 'Club', dmg: 4, inj: 14, load: 1, prof: 'Brawling', notes: '' },
  { name: 'Short Sword', dmg: 3, inj: 16, load: 1, prof: 'Swords', notes: '' },
  { name: 'Sword', dmg: 4, inj: 16, load: 2, prof: 'Swords', notes: '' },
  { name: 'Long Sword', dmg: 5, inj: '16/18', load: 3, prof: 'Swords', notes: '1h or 2h (2h Inj 18)' },
  { name: 'Short Spear', dmg: 3, inj: 14, load: 2, prof: 'Spears', notes: 'Can be thrown' },
  { name: 'Spear', dmg: 4, inj: '14/16', load: 3, prof: 'Spears', notes: '1h/2h, can be thrown' },
  { name: 'Great Spear', dmg: 5, inj: 16, load: 4, prof: 'Spears', notes: '2-handed' },
  { name: 'Axe', dmg: 5, inj: 18, load: 2, prof: 'Axes', notes: '' },
  { name: 'Long-hafted Axe', dmg: 6, inj: '18/20', load: 3, prof: 'Axes', notes: '1h or 2h (2h Inj 20)' },
  { name: 'Great Axe', dmg: 7, inj: 20, load: 4, prof: 'Axes', notes: '2-handed' },
  { name: 'Mattock', dmg: 7, inj: 18, load: 3, prof: 'Axes', notes: '2-handed' },
  { name: 'Bow', dmg: 3, inj: 14, load: 2, prof: 'Bows', notes: 'Ranged, 2h' },
  { name: 'Great Bow', dmg: 4, inj: 16, load: 4, prof: 'Bows', notes: 'Ranged, 2h' }
];

const REWARDS = [
  { name: 'Close-fitting',  type: 'Armour/Helm',         desc: 'Add +2 to your Protection roll result while wearing it' },
  { name: 'Cunning Make',   type: 'Armour/Helm/Shield',  desc: 'Reduce Load rating by 2 (min 0)' },
  { name: 'Fell',           type: 'Weapon',              desc: 'Add 2 to Injury rating (both ratings if 1h/2h)' },
  { name: 'Grievous',       type: 'Weapon',              desc: 'Add 1 to Damage rating' },
  { name: 'Keen',           type: 'Weapon',              desc: 'Attack rolls score Piercing Blow also on Feat 9+' },
  { name: 'Reinforced',     type: 'Shield',              desc: 'Add 1 to shield Parry bonus' }
];

const VIRTUES_GENERIC = [
  { name: 'Confidence',  desc: 'Raise max Hope by 2', effect: { hopeBonusVirtue: 2 } },
  { name: 'Dour-handed', desc: 'Heavy Blow: +1 Strength damage; Pierce: +1 Feat Die', effect: null },
  { name: 'Hardiness',   desc: 'Raise max Endurance by 2 (or by Wisdom rating, whichever higher)', effect: { endBonusVirtue: 2 } },
  { name: 'Mastery',     desc: 'Choose two Skills and make them Favoured', effect: null },
  { name: 'Nimbleness',  desc: 'Raise Parry by 1', effect: { parryBonusVirtue: 1 } },
  { name: 'Prowess',     desc: 'Lower one Attribute TN by 1', effect: null }
];

const CULTURAL_VIRTUES = {
  'Bardings': [
    { name: 'Cram',                  desc: 'Each Journey Event Fatigue: gain 1 less. Short Rest: all Company regain Endurance = your Wisdom' },
    { name: 'Dragon-Slayer',         desc: 'Attack rolls vs Might 2+ creatures are Favoured' },
    { name: 'Dwarf-Friend',          desc: 'In Defensive stance, Protect Companion as secondary action. Dwarves are Friendly in councils' },
    { name: 'Fierce Shot',           desc: "On a ranged Piercing Blow, target's Protection roll is Ill-favoured" },
    { name: 'High Destiny',          desc: '+1 max Endurance. First time a Wound would kill you, you survive Wounded and +1 max Hope (once only)', effect: { endBonusVirtue: 1 } },
    { name: 'The Language of Birds', desc: 'Communicate with birds (Courtesy/Persuade/Song). Once per Combat/Council/Journey, be Inspired on any one roll' }
  ],
  "Dwarves of Durin's Folk": [
    { name: 'Baruk Khazâd!',     desc: 'Once per combat in Forward stance: attack Favoured + Intimidate Foe combat task as secondary' },
    { name: 'Broken Spells',     desc: 'Mark 3 Skills (≥1 rank). On those, spend 1 Hope for Magical Success' },
    { name: 'Dark for Dark Business', desc: 'When in the dark (night/underground), Inspired on all rolls' },
    { name: "Durin's Way",       desc: '+2 Parry when fighting underground or in cramped quarters' },
    { name: 'Stone-Hard',        desc: '+1 max Endurance. All Protection rolls Favoured (unless Miserable)', effect: { endBonusVirtue: 1 } },
    { name: 'Untameable Spirit', desc: '+1 max Hope. Gain (1d) on Shadow Tests to resist Sorcery', effect: { hopeBonusVirtue: 1 } }
  ],
  'Elves of Lindon': [
    { name: 'Against the Unseen',     desc: 'Shadow Tests vs Dread are Favoured. Gain (1d) on rolls forced by evil spirits/ghosts' },
    { name: 'Deadly Archery',         desc: 'Using a Bow (not Great Bow) in Rearward stance: Prepare Shot combat task as secondary action' },
    { name: 'Elbereth Gilthoniel!',   desc: '+1 max Hope. Adventuring Phase: become Inspired on a number of rolls = Wisdom rating', effect: { hopeBonusVirtue: 1 } },
    { name: 'Elvish Dreams',          desc: 'Short Rest counts as Prolonged Rest. No sleep needed during simple activities' },
    { name: 'Gleam of Wrath',         desc: 'Successful attack: adversary loses 1 Hate/Resolve + 1 per success icon' },
    { name: 'Memory of Ancient Days', desc: 'Journey Events: Wild→Border, Dark→Wild table. Always allowed to cover Scout role' }
  ],
  'Hobbits of the Shire': [
    { name: 'Art of Disappearing',   desc: 'On the smallest chance to hide, roll Stealth: success = you simply disappear' },
    { name: 'Brave at a Pinch',      desc: 'When Miserable, Weary, or Wounded: Inspired on all rolls' },
    { name: 'Small Folk',            desc: '+2 Parry in close combat vs bigger creatures. Take Rearward even with only 1 other in close combat' },
    { name: 'Sure at the Mark',      desc: 'All ranged attacks Favoured. Thrown stones: Piercing Blow on Rune, Injury 12' },
    { name: 'Three is Company',      desc: '+1 Fellowship Rating. May select a second Fellowship Focus' },
    { name: 'Tough as Old Tree-Roots', desc: 'Wound severity: roll 2 Feat Dice, keep better. Double Strength when recovering Endurance' }
  ],
  'Men of Bree': [
    { name: 'Bree-Pony',           desc: '+1 max Hope. Pony has Vigour 4 always. Pony returns if abandoned', effect: { hopeBonusVirtue: 1 } },
    { name: 'Defiance',            desc: 'End of each Combat scene (if not Wounded/Miserable): recover Endurance = Heart or Wisdom' },
    { name: 'Desperate Courage',   desc: 'Spending Hope: may also gain 1 Shadow to be Inspired for that roll' },
    { name: 'Friendly and Familiar', desc: '+1 to max Skill rolls in councils. Encountered folk always Friendly' },
    { name: 'Strange as News from Bree', desc: 'Each Fellowship Phase: a rumour from LM. In Bree-land: gain (1d) on Insight and Riddle' },
    { name: 'The Art of Smoking',  desc: 'Whenever you regain Hope, recover 1 additional Hope point' }
  ],
  'Rangers of the North': [
    { name: 'Endurance of the Ranger', desc: '+1 max Endurance. Wearing Leather (no helm)/no armour + no shield: no Fatigue during journey', effect: { endBonusVirtue: 1 } },
    { name: 'Foresight of Their Kindred', desc: 'Adventuring Phase: invoke foresight Wisdom-rating times to reroll all dice on any roll' },
    { name: 'Heir of Arnor',          desc: 'Create a Marvellous Artefact OR Famous Weapon with 1 Enchanted + up to 2 normal Rewards' },
    { name: 'Royalty Revealed',       desc: 'Once per combat in Open stance: Rally Comrades secondary action. Company Inspired next round' },
    { name: 'Strength of Will',       desc: 'Gain (1d) on all Shadow Tests vs Dread' },
    { name: 'Ways of the Wild',       desc: 'Rolling Explore/Hunting/Travel: spend 1 Hope for Magical Success. Cover multiple journey roles' }
  ],
  // === Peoples of Wilderland supplement ===
  'Beornings': [
    { name: "Beorn's Enchantment", desc: 'Mark 3 Strength Skills. When using any of them, spend 1 Hope for Magical Success' },
    { name: 'Brother to Bears',    desc: '+1 max Endurance. Brawling attacks don\'t lose 1d; unarmed PB on Rune, Injury 12. Communicate with bears.', effect: { endBonusVirtue: 1 } },
    { name: 'Great Strength',      desc: 'Heavy Blow Special Damage: +2 Strength rating' },
    { name: 'Skin-Coat',           desc: 'Wearing Leather armour or no armour: gain (1d) on Protection rolls' },
    { name: 'Splitting Blow',      desc: 'Close combat Piercing Blow: target\'s Protection roll is Ill-favoured' },
    { name: 'Twice-Baked Honey-Cakes', desc: 'Each Journey Event Fatigue: -1. Fellowship Rating +1' }
  ],
  'Elves of Mirkwood': [
    { name: 'Against the Unseen',  desc: 'Shadow Tests vs Dread Favoured. Gain (1d) on rolls vs spirits/ghosts' },
    { name: 'Deadly Archery',      desc: 'Bow (not Great Bow) in Rearward Stance: Prepare Shot as secondary action' },
    { name: 'Elf-Lights',          desc: 'Spend 1 Hope to light enchanted torch/lamp; enchants creatures up to Wisdom Might total. Surprises enemies + Weary first 2 rounds' },
    { name: 'Elvish Dreams',       desc: 'Short Rest counts as Prolonged Rest. No sleep needed for simple activities' },
    { name: 'Gleam of Wrath',      desc: 'Successful attack: foe loses 1 Hate/Resolve + 1 per success icon' },
    { name: 'Shots in the Dark',   desc: 'In forest or at night: Inspired on all combat rolls' }
  ],
  'Woodmen of Wilderland': [
    { name: "A Hunter's Resolve", desc: 'If not Wounded/Miserable, spend 1 Hope: recover Endurance = Heart OR Valour rating (whichever higher)' },
    { name: 'Herbal Remedies',    desc: 'Gain (1d) on Healing rolls. Can roll Healing at end of journey to reduce Fatigue' },
    { name: 'Forest Harrier',     desc: 'Opening volleys & close combat attacks first combat round are Favoured' },
    { name: 'Hound of Mirkwood',  desc: 'Wolfhound companion: +1d on Awareness/Hunting; first attack against you each round loses 1d; can cancel Piercing Blow (wounds hound)' },
    { name: 'Natural Watchfulness', desc: 'Spend 1 Hope on Awareness/Explore/Scan for Magical Success. Cover Look-out + another journey role' },
    { name: 'Staunching Song',    desc: '+1 max Hope. Roll Song for First Aid or to save Dying heroes', effect: { hopeBonusVirtue: 1 } }
  ],
  // Dwarves of Nogrod & Belegost — Durin's Folk virtues, replacing Broken Spells & Durin's Way.
  'Dwarves of Nogrod and Belegost': [
    { name: 'Baruk Khazâd!',     desc: 'Once per combat in Forward stance: attack Favoured + Intimidate Foe combat task as secondary' },
    { name: 'Ancient Fire',      desc: '+1 max Endurance. Endurance loss from extreme cold, fire, and poison is reduced by one level (grievous→severe→moderate→none)', effect: { endBonusVirtue: 1 } },
    { name: 'Dark for Dark Business', desc: 'When in the dark (night/underground), Inspired on all rolls' },
    { name: "Telchar's Secrets", desc: 'Next Yule: add a single Enchanted Reward of Dwarven craftsmanship to a mail armour or close-combat weapon, OR create a Marvellous Artefact (your choice)' },
    { name: 'Stone-Hard',        desc: '+1 max Endurance. All Protection rolls Favoured (unless Miserable)', effect: { endBonusVirtue: 1 } },
    { name: 'Untameable Spirit', desc: '+1 max Hope. Gain (1d) on Shadow Tests to resist Sorcery', effect: { hopeBonusVirtue: 1 } }
  ],
  // High Elves of Rivendell — Elves of Lindon virtues + four of their own.
  'High Elves of Rivendell': [
    { name: 'Against the Unseen',     desc: 'Shadow Tests vs Dread are Favoured. Gain (1d) on rolls forced by evil spirits/ghosts' },
    { name: 'Deadly Archery',         desc: 'Using a Bow (not Great Bow) in Rearward stance: Prepare Shot combat task as secondary action' },
    { name: 'Elbereth Gilthoniel!',   desc: '+1 max Hope. Adventuring Phase: become Inspired on a number of rolls = Wisdom rating', effect: { hopeBonusVirtue: 1 } },
    { name: 'Elvish Dreams',          desc: 'Short Rest counts as Prolonged Rest. No sleep needed during simple activities' },
    { name: 'Gleam of Wrath',         desc: 'Successful attack: adversary loses 1 Hate/Resolve + 1 per success icon' },
    { name: 'Memory of Ancient Days', desc: 'Journey Events: Wild→Border, Dark→Wild table. Always allowed to cover Scout role' },
    { name: 'Artificer of Eregion',   desc: 'Next Yule: add an Enchanted Reward of Elven craftsmanship to a weapon, OR create a Marvellous Artefact. Also, in any Fellowship Phase: CRAFT or LORE roll to fully study one Marvellous Artefact / Wondrous Item' },
    { name: 'Beauty of the Stars',    desc: '+1 max Hope. As council spokesperson: +1 Time Limit, OR make all Mortals present retain only a vague memory of the council (a lesser magical effect — raises Eye Awareness)', effect: { hopeBonusVirtue: 1 } },
    { name: 'Might of the Firstborn', desc: 'When an adversary spends Hate/Resolve to activate a Fell Ability, spend 1 Hope to cancel its effects' },
    { name: 'Skill of the Eldar',     desc: 'When you roll a ᚱ (Gandalf rune) on the Feat die, your result counts as a Magical Success without spending Hope' }
  ]
};

// Previous Experience creation costs (cost to REACH new rank; 0 means rank not buyable at creation)
const SKILL_PE_COST = [0, 1, 2, 3, 5, 0, 0];  // skills cap at 4 during creation
const PROF_PE_COST  = [0, 2, 4, 6, 0, 0, 0];  // combat profs cap at 3 during creation
const PE_BUDGET_DEFAULT = 10;
const PE_BUDGET_STRIDER = 15;  // Strider/Moria solo: solo heroes start with extra "grit"
// --- Solo-mode helpers. Precedence: Moria > Strider > normal on shared surfaces. ---
function isMoria()   { return !!char.moriaMode; }
function isSolo()    { return !!char.moriaMode || !!char.striderMode; }  // PE budget, no Focus, no journey roles
function oracleSet() { return char.moriaMode ? 'moria' : (char.striderMode ? 'strider' : null); }
// Both Dwarf cultures share Redoubtable (halve armour Load) + the no-great-weapon/shield restriction.
function isDwarfCulture(c) { c = c || char.culture; return c === "Dwarves of Durin's Folk" || c === 'Dwarves of Nogrod and Belegost'; }
// Use this getter everywhere PE_BUDGET was referenced; reads mode at call time.
function getPEBudget() { return isSolo() ? PE_BUDGET_STRIDER : PE_BUDGET_DEFAULT; }
const PE_BUDGET = PE_BUDGET_DEFAULT;  // legacy alias; references should migrate to getPEBudget()

const ENEMY_LORE_TYPES = ['Evil Men', 'Orcs', 'Spiders', 'Trolls', 'Wargs', 'Undead'];

// === Character Lifepaths supplement === 6 cultures × 6 backstories each
const LIFEPATHS = {
  'Bardings': [
    { die: 1, name: 'By Hammer and Anvil', story: 'Your parents paid richly for a Dwarf-smith to take you as an apprentice in his forge, and you worked hard under his severe discipline, to prove that your craft could reach his people\'s high standards.', attrs: {str:5, hrt:7, wit:2}, favouredSkill: 'Athletics', features: ['Proud','Wilful'] },
    { die: 2, name: 'Wordweaver', story: 'King Bard earned his throne by accomplishing a feat deemed unthinkable by most. But it is the witty halfling who crossed words with Smaug the Golden in his lair that fired your imagination. You look forward to your chance to win renown with your cunning.', attrs: {str:4, hrt:6, wit:4}, favouredSkill: 'Enhearten', features: ['Eager','Fair'] },
    { die: 3, name: 'Gifted Senses', story: 'You are the first to notice when things are out of place, or just don\'t smell or sound right. Others have learned to pay attention to your intuition, and invite you to help them.', attrs: {str:5, hrt:5, wit:4}, favouredSkill: 'Athletics', features: ['Bold','Generous'] },
    { die: 4, name: 'Healing Hands', story: 'You have long served on a trading boat from Esgaroth. Once you fell victim to a foreign sickness in a distant town, and were succoured by a lady who saved your life and taught you how to save others in their time of need.', attrs: {str:4, hrt:7, wit:3}, favouredSkill: 'Enhearten', features: ['Generous','Tall'] },
    { die: 5, name: 'Dragon Stories', story: 'Your family told many tales of Smaug the Dragon, from its arrival long ago to its death at the hand of King Bard. But now, the only dragons in Dale grace the painted signs of inns, and so you have left your home in search of adventure.', attrs: {str:5, hrt:6, wit:3}, favouredSkill: 'Enhearten', features: ['Eager','Proud'] },
    { die: 6, name: 'A Patient Hunter', story: 'Faithful to your ancestors\' heritage, your family never embraced the ways of the merchants of Esgaroth. For a few years after the death of the Dragon, hunting was a dangerous trade. But now the land is again blooming with every new spring.', attrs: {str:6, hrt:6, wit:2}, favouredSkill: 'Athletics', features: ['Bold','Fierce'] }
  ],
  "Dwarves of Durin's Folk": [
    { die: 1, name: 'A Life of Toil', story: 'Your ancestors crafted wondrous things out of shining stones and precious metals, while you have been forced to labour hard in the mines for far less noble ore. Most ancient Dwarf-holds are no more than Dragon\'s lairs or Orc-infested pits.', attrs: {str:7, hrt:2, wit:5}, favouredSkill: 'Craft', features: ['Secretive','Wilful'] },
    { die: 2, name: 'Far Trader', story: 'By the reckoning of the Dwarves, you were only a stripling when you left your home to follow your kin along the trading roads. You have since seen many places and met different folks, and your heart burns with a desire to see more.', attrs: {str:6, hrt:2, wit:6}, favouredSkill: 'Travel', features: ['Cunning','Proud'] },
    { die: 3, name: 'Bitter Exile', story: 'Your ancestors fled their ancestral home in the far North, and you grew up hearing stories of lost Dwarf-halls fallen to Orc-kind or burnt to cinders by Dragons. It is your ambition to return to those mountains and set things right.', attrs: {str:7, hrt:3, wit:4}, favouredSkill: 'Travel', features: ['Fierce','Proud'] },
    { die: 4, name: 'Eloquent Orator', story: 'The hardships endured by your folk during two ages of the world have inspired many songs. But the words that come easier to your lips are those recounting feats of great cunning, not those about deeds of valour.', attrs: {str:5, hrt:4, wit:5}, favouredSkill: 'Craft', features: ['Cunning','Lordly'] },
    { die: 5, name: 'The Grief of Azanulbizar', story: 'A great war was fought between the Dwarves and the Orcs of the Misty Mountains almost two centuries ago. The parents and grandparents of most Dwarves, including yours, remember the horrors of that war.', attrs: {str:6, hrt:3, wit:5}, favouredSkill: 'Travel', features: ['Fierce','Stern'] },
    { die: 6, name: 'A Penetrating Gaze', story: 'Your elder sibling instructed you to judge others by their deeds, not their words, especially when dealing with the fair-spoken Elves. Thieves and liars do not dare to meet your eyes, as you seem able to lay bare their plots with only a glance.', attrs: {str:6, hrt:4, wit:4}, favouredSkill: 'Craft', features: ['Wary','Wilful'] }
  ],
  'Elves of Lindon': [
    { die: 1, name: 'Visitor to the Mountains', story: 'Not content to stay in your homeland, you were drawn to the Blue Mountains and the folk who reside there. Most Dwarves want nothing to do with an overcurious Elf, but a few taught you enough to appreciate their skills and love of beautiful objects.', attrs: {str:5, hrt:2, wit:7}, favouredSkill: 'Lore', features: ['Fair','Swift'] },
    { die: 2, name: 'Sky-Watcher', story: 'When aboard a ship, you study the skies and predict the weather. Now, when you are at home in the Havens, you notice strange movements in the air coming from the south-east, where lies Mordor, the Land of Shadows.', attrs: {str:4, hrt:3, wit:7}, favouredSkill: 'Lore', features: ['Keen-eyed','Wary'] },
    { die: 3, name: 'Maker of Ships', story: 'You studied your chosen craft under the expert shipbuilders of Cirdan; but though the long firth of Lune stirs your heart, you feel the world is wide, and you have lived your life on its edge. Perhaps it is time to go where no ship can take you.', attrs: {str:5, hrt:3, wit:6}, favouredSkill: 'Song', features: ['Fair','Lordly'] },
    { die: 4, name: 'The Call of the Sea', story: 'No Elf could live by the Sea and not be moved by it. The crashing of waves is a second heartbeat to you; but you do not want to depart Middle-earth yet, for you feel you have some purpose to fulfil before you sail away.', attrs: {str:4, hrt:4, wit:6}, favouredSkill: 'Song', features: ['Patient','Subtle'] },
    { die: 5, name: 'Tower Guard', story: 'Your folk guards the Tower Hills, lest the Enemy benefit from great secrets hidden there. By Mithrandir\'s advice, you keep a secret watch on the border of the little folk. A fondness for them grows in your heart.', attrs: {str:5, hrt:4, wit:5}, favouredSkill: 'Lore', features: ['Keen-eyed','Merry'] },
    { die: 6, name: 'A Merchant Family', story: 'Elven ships still sometimes sail to Dol Amroth and Pelargir to trade with the Men of Gondor. But the Corsairs of Umbar grow more numerous. Now ships seldom sail south, and you have decided to travel elsewhere.', attrs: {str:6, hrt:2, wit:6}, favouredSkill: 'Song', features: ['Lordly','Wary'] }
  ],
  'Hobbits of the Shire': [
    { die: 1, name: 'Restless Farmer', story: 'You were born into a family of farmers in the Southfarthing, where the best pipe-weed grows. From time to time, you feel your closeness to the earth move you, awakening a desire to sleep in the fields, under a canopy of stars.', attrs: {str:3, hrt:6, wit:5}, favouredSkill: 'Stealth', features: ['Faithful','Rustic'] },
    { die: 2, name: 'Too Many Paths to Tread', story: 'Your father was a tradesman and you were supposed to take his place in his workshop in Hardbottle. But before that time, a mysterious wanderlust took you away from home for months. You know that secretly your father approves; he always dreamed of leaving the Shire to "go see Elves"!', attrs: {str:4, hrt:5, wit:5}, favouredSkill: 'Courtesy', features: ['Eager','Merry'] },
    { die: 3, name: 'On Patrol', story: 'Your aunt was a Shirriff, and often brought you along with her when she went "beating the bounds". More often than not, her watch included a visit to The Ivy Bush, a small inn on the Bywater Road. There, you heard the best stories over deep mugs of excellent beer.', attrs: {str:3, hrt:7, wit:4}, favouredSkill: 'Courtesy', features: ['Inquisitive','Keen-eyed'] },
    { die: 4, name: 'Witty Gentlehobbit', story: 'You come from a well-to-do family of landed Westfarthing gentry, living in a Hobbit-hole in Michel Delving. It is rumoured that your great-grandfather once vanished, only to show up three days later at the local inn, talking of a giant Tree-man he had seen on the North Moors.', attrs: {str:2, hrt:6, wit:6}, favouredSkill: 'Courtesy', features: ['Fair-spoken','Merry'] },
    { die: 5, name: 'Bucklander', story: 'Your parents belong to the folk of Buckland, and you were brought up on the "wrong side of the Brandywine River", as they say. If half the tales be true, members of your family have always displayed a certain queerness of character.', attrs: {str:4, hrt:6, wit:4}, favouredSkill: 'Stealth', features: ['Keen-eyed','Rustic'] },
    { die: 6, name: 'Tookish Blood', story: 'Yours is an honourable family of potters and masons from the Marish, Eastfarthing. One day, something Tookish stirred in your blood and overcame your respectability. From that night on, you started to shun well-trodden paths, hoping to meet other wayfarers secretly crossing the Shire.', attrs: {str:2, hrt:7, wit:5}, favouredSkill: 'Stealth', features: ['Eager','Honourable'] }
  ],
  'Men of Bree': [
    { die: 1, name: 'Crossroads of the North', story: 'Your family has run a business in Bree since forever, serving the needs of Bree-landers and wanderers alike. Your grandfather even says he once had Elves on his doorstep. You worked in the family business when you were younger, until a great desire came to follow the Road.', attrs: {str:2, hrt:5, wit:7}, favouredSkill: 'Insight', features: ['Faithful','Generous'] },
    { die: 2, name: 'Off With Dwarves', story: 'Once, Dwarven travellers passing through Bree on their way to the Blue Mountains took you with them to care for their ponies. You became friends, if that is a word that can describe the grudging respect you earned from that stern folk.', attrs: {str:3, hrt:4, wit:7}, favouredSkill: 'Riddle', features: ['Fair-spoken','Faithful'] },
    { die: 3, name: 'Up the Greenway', story: 'Your grandfather was not born in the Bree-land. He made a long journey up from the South, across the Gap of Rohan. The North is cold and wild compared to the southern lands, but the tales your grandfather used to tell about the fierce kings of the South never made you doubt his choice.', attrs: {str:3, hrt:5, wit:6}, favouredSkill: 'Insight', features: ['Fair-spoken','True-hearted'] },
    { die: 4, name: 'No Longer Free from Care and Fear', story: 'Many years ago you discovered that the Bree-land is far from being safe, but is rather a small island surrounded by unseen foes. You have listened to the stories the Rangers tell when they trust somebody. Now you know that a Shadow is returning.', attrs: {str:4, hrt:4, wit:6}, favouredSkill: 'Riddle', features: ['Inquisitive','Rustic'] },
    { die: 5, name: 'Forest-Dweller', story: 'Your kin dwell in the Chetwood, east of Bree. Most of the forest is wholesome, but parts of it — especially near the Midgewater Marshes — have their own perils. As a child you learned to find food safely. It was worth creeping out of Archet-village at night.', attrs: {str:4, hrt:5, wit:5}, favouredSkill: 'Riddle', features: ['Cunning','Rustic'] },
    { die: 6, name: 'Gate-Warden', story: 'Great care is kept in the Bree-land to keep out of its borders anyone, or anything, that would make trouble. In addition to your ordinary job you served as one of the gate-wardens, and spent many cold, lonely nights on watch, with only the stars and hooting owls for company.', attrs: {str:2, hrt:6, wit:6}, favouredSkill: 'Insight', features: ['Inquisitive','Patient'] }
  ],
  'Rangers of the North': [
    { die: 1, name: 'Hunter of Orcs', story: 'Orcs raid the lone-lands of Eriador from their lairs in the mountains, causing great destruction. You protect the isolated farmsteads and communities, forcing the Orcs back into their holes. Your heart cries for vengeance, but your mind fears there will be no end to this war.', attrs: {str:7, hrt:5, wit:2}, favouredSkill: 'Hunting', features: ['Bold','Stern'] },
    { die: 2, name: 'Keeper of Lore', story: 'The history of your people is long and often obscure, recorded only in Rivendell, away from the eyes of most of your kin. Elrond has noticed and appreciated your efforts to spread the memory of the bitter struggle of your folk, and allowed you to visit the Last Homely House to learn.', attrs: {str:7, hrt:4, wit:3}, favouredSkill: 'Lore', features: ['Honourable','True-hearted'] },
    { die: 3, name: 'Watcher on the Border', story: 'Interested in the edges of things, especially maps, you were often sent to the borders of the land of your folk to keep watch on the servants of the Enemy. You\'ve learned that the reach of the Shadow has grown, but that some simple people will not falter.', attrs: {str:6, hrt:5, wit:3}, favouredSkill: 'Hunting', features: ['Secretive','Tall'] },
    { die: 4, name: 'Far-reaching Herald', story: 'You wandered the far corners of the Northern Realm and travelled to places unknown to most before you reached 14 years of age. Your talents have been noticed, and you have become a carrier of tidings, at the service of the many Rangers spread across one of the most dangerous realms.', attrs: {str:6, hrt:4, wit:4}, favouredSkill: 'Hunting', features: ['Swift','True-hearted'] },
    { die: 5, name: 'Counsellor', story: 'You have been taught that the Enemy thrives upon secrecy and deception. For the plans of his servants to be laid bare, their honey-tongued lies must be exposed and their twisted words unravelled. Fortunately, you can see through their tricks.', attrs: {str:5, hrt:5, wit:4}, favouredSkill: 'Lore', features: ['Secretive','Subtle'] },
    { die: 6, name: 'Protector of the Land', story: 'Your people did not always live scattered across the lone-lands. Long ago, they were rulers, nobles and artisans of great kingdoms that existed here. Those realms failed and now you\'ve only the land itself. Keep it safe, and it will do the same for you.', attrs: {str:6, hrt:6, wit:2}, favouredSkill: 'Lore', features: ['Bold','Honourable'] }
  ]
};

const MAJOR_EVENTS = [
  { die: 'eye',  name: 'hounded by the Shadow', short: 'Start with 1 Shadow Scar + 10 extra Previous Experience points', effects: ['scars+1', 'pe+10'] },
  { die: 1,      name: 'destitute',             short: 'Lower Standard of Living by 1 tier. Start with 5 extra Previous Experience', effects: ['sol-1', 'pe+5'] },
  { die: 2,      name: 'half-wise',             short: 'Raise Wits TN by 1, lower another Attribute TN of your choice by 1', effects: ['witTN+1', 'attrTN-1'] },
  { die: 3,      name: 'grim',                  short: 'Raise Heart TN by 1, lower another Attribute TN of your choice by 1', effects: ['hrtTN+1', 'attrTN-1'] },
  { die: 4,      name: 'clumsy',                short: 'Raise Strength TN by 1, lower another Attribute TN of your choice by 1', effects: ['strTN+1', 'attrTN-1'] },
  { die: 5,      name: 'reclusive',             short: 'Reduce Company Fellowship rating by 1 point. Mark an additional Skill of your choice as Favoured', effects: ['fellow-1', 'fav+1'] },
  { die: 6,      name: 'mirthful',              short: 'Increase Company Fellowship rating by 1. Choose one of your Favoured Skills — it is no longer Favoured', effects: ['fellow+1', 'fav-1'] },
  { die: 7,      name: 'slender',               short: 'Lower Endurance by 2, increase Parry rating by 1', effects: ['end-2', 'parry+1'] },
  { die: 8,      name: 'simple',                short: 'Increase Hope by 2. Choose two Favoured Skills — they are no longer Favoured', effects: ['hope+2', 'fav-2'] },
  { die: 9,      name: 'vigorous',              short: 'Increase Endurance by 2, lower Parry rating by 1', effects: ['end+2', 'parry-1'] },
  { die: 10,     name: 'blessed',               short: 'Raise Standard of Living by 1 tier. Start with 5 LESS Previous Experience points', effects: ['sol+1', 'pe-5'] },
  { die: 'rune', name: 'favoured by the Grey Wizard', short: 'Treat any 1 rolled on the Feat die as an 11. Raise Eye Awareness of your Company by 2', effects: ['greyWizard', 'eyeAwareness+2'] }
];

const NAMES = {
  'Bardings': {
    male: ['Aegir','Arn','Brandulf','Domarr','Egil','Erland','Farald','Finn','Gautarr','Hafgrim','Hjalmar','Ingolf','Jofur','Kolbeinn','Leiknir','Lomund','Munan','Nari','Nefstan','Ottarr','Ragnarr','Reinald','Sigmarr','Steinarr','Thorald','Torwald','Ulfarr','Unnarr','Vandil','Varinn'],
    female: ['Aldis','Asfrid','Bera','Bergdis','Dagmar','Eilif','Erna','Frida','Geira','Gudrun','Halla','Hild','Ingirun','Ingrith','Lif','Linhild','Kelda','Runa','Saldis','Sigga','Sigrun','Thora','Thordis','Thorhild','Ulfhild','Ulfrun','Una','Valdis','Vigdis','Walda'],
    family: null  // Bardings use patronymics (e.g. "Lifstan, son of Leiknir")
  },
  "Dwarves of Durin's Folk": {
    male: ['Ai','Anar','Beli','Bláin','Borin','Burin','Bruni','Farin','Flói','Frár','Frerin','Frór','Ginar','Gróin','Grór','Hanar','Hepti','Iari','Lófar','Lóni','Náli','Nár','Niping','Nói','Núr','Nýrád','Ónar','Póri','Regin','Svior','Veig','Vidar'],
    female: ['Adis','Afrid','Agda','Bersa','Birna','Dagrún','Dís','Drífa','Edda','Elin','Fenja','Frida','Geira','Gísla','Hadda','Hón','Ida','Ilmr','Jóra','Kára','Kóna','Lif','Linhild','Már','Mist','Nál','Oda','Ósk','Rán','Rinda','Sefa','Syn','Tóra','Trana','Úlfrún','Vírún','Yrr'],
    family: null  // Dwarves keep secret true names; adopt names of neighbours
  },
  'Elves of Lindon': {
    male: ['Amras','Aredhel','Beleganor','Belegon','Calanhir','Carmagor','Dagorhir','Durandir','Edrahil','Ellahir','Fincalan','Fuindor','Galdagor','Galdor','Hallas','Hirimlad','Ithildir','Lascalan','Linaith','Mablin','Malanor','Nauros','Orgalad','Pelegorn','Sargon'],
    female: ['Anórel','Aranel','Arbereth','Baraniel','Calanril','Celebrindal','Celenneth','Elanor','Elwing','Eraniel','Fimbrethil','Gloredhel','Idril','Irilde','Laurelin','Lórwend','Lothíriel','Meneloth','Moriel','Narieth','Narniel','Nimloth','Nimrodel','Níniel','Tarandís'],
    family: null
  },
  'Hobbits of the Shire': {
    male: ['Andwise','Berilac','Bungo','Cottar','Doderic','Dudo','Erling','Fastred','Ferumbras','Folco','Gorhendad','Griffo','Halfred','Hamson','Ilberic','Isembold','Isengar','Longo','Marmadas','Marroc','Mungo','Odo','Orgulas','Otho','Posco','Reginard','Robin','Rudigar','Sadoc','Saradas','Tobold','Tolman'],
    female: ['Adaldrida','Amaranth','Asphodel','Belba','Bell','Berylla','Camellia','Daisy','Eglantine','Estella','Gilly','Hanna','Lily','Malva','Marigold','May','Melilot','Menegilda','Mentha','Mirabella','Myrtle','Pearl','Peony','Pervinca','Pimpernel','Primrose','Prisca','Rosamunda','Ruby','Salvia'],
    family: ['Baggins','Boffin','Bolger','Bracegirdle','Brandybuck','Brown','Brownlock','Bunce','Burrows','Cotton','Gamgee','Gardner','Goldworthy','Goodbody','Goodchild','Grubb','Headstrong','Hornblower','Maggot','Noakes','North-tooks','Proudfoot','Puddifoot','Roper','Rumble','Sackville','Smallburrow','Took','Twofoot','Whitfoot']
  },
  'Men of Bree': {
    male: ['Alfred','Artie','Bill','Bob','Carl','Ed','Fred','Giles','Herb','Larry','Nob','Oswald','Percy','Perry','Sid','Tom','Harry'],
    female: ['Daisy','Emma','Etta','Fay','Fern','Flora','Gert','Holly','Lily','Myrtle','Poppy','Rose','Sage','Tilly','Violet'],
    family: ['Appledore','Asterfire','Bellsap','Briarcleave','Butterbur','Cherryborn','Chesterstout','Droverwind','Ferny','Foxglow','Goatleaf','Hardybough','Heathertoes','Hedgedon','Kettlegrass','Lilyhawk','Mossburn','Mugworts','Oakstout','Pickthorn','Pollenroad','Rushlight','Shrubrose','Sweetroot','Thistlewool','Wayward']
  },
  'Rangers of the North': {
    male: ['Adrahil','Amlaith','Arvegil','Baranor','Belecthor','Bergil','Celepharn','Cirion','Damrod','Dirhael','Duinhir','Egalmoth','Eradan','Findemir','Forlong','Golasdan','Hallas','Hirluin','Ingold','Iorlas','Malvegil','Ohtar','Orodreth','Tarannon','Targon'],
    female: ['Anwen','Arbereth','Berúthiel','Baraniel','Calanril','Celenneth','Elnîth','Eraniel','Finduilas','Gilraen','Gilraeth','Gloredhel','Idril','Ioreth','Ivorwen','Lórwend','Lothíriel','Luindîs','Meneloth','Moriel','Morwen','Narieth','Narniel','Orothél','Tarandís'],
    family: null
  },
  // === Peoples of Wilderland supplement ===
  'Beornings': {
    male: ['Agilfrid','Arnulf','Avagis','Baldac','Barald','Berangar','Cilderic','Eberulf','Eboric','Evermud','Frideger','Garivald','Geberic','Gerold','Grimfast','Hartmut','Hathus','Heriwulf','Ingund','Iwald','Leudast','Magneric','Maracar','Otbert','Ramnulf','Rathar','Rigunth','Sigeric','Theodard','Thorismund','Walcaud','Widuven','Wulferd'],
    female: ['Adosinda','Amalfrida','Amalina','Avagisa','Avina','Basina','Beranhild','Brunihild','Deuteria','Gailavira','Garsendis','Geleswinta','Gelvira','Grimhild','Gunteuch','Hermesind','Heva','Hilduara','Ingund','Radegund','Sichild','Verich','Waldrada','Wisigard'],
    family: null  // Beornings use bynames (the Bald, the Bold, the Eloquent, etc.)
  },
  'Elves of Mirkwood': {
    // Same Sindarin name pool as Elves of Lindon
    male: ['Amras','Aredhel','Beleganor','Belegon','Calanhir','Carmagor','Dagorhir','Durandir','Edrahil','Ellahir','Fincalan','Fuindor','Galdagor','Galdor','Hallas','Hirimlad','Ithildir','Lascalan','Linaith','Mablin','Malanor','Nauros','Orgalad','Pelegorn','Sargon'],
    female: ['Anórel','Aranel','Arbereth','Baraniel','Calanril','Celebrindal','Celenneth','Elanor','Elwing','Eraniel','Fimbrethil','Gloredhel','Idril','Irilde','Laurelin','Lórwend','Lothíriel','Meneloth','Moriel','Narieth','Narniel','Nimloth','Nimrodel','Níniel','Tarandís'],
    family: null
  },
  'Woodmen of Wilderland': {
    male: ['Amalric','Ansegisel','Audovald','Balderic','Beranald','Beormud','Ebrimuth','Euric','Gisalric','Grimbald','Gundovald','Hartgard','Hartnid','Imnachar','Ingelram','Malaric','Munderic','Odo','Odovacar','Reginar','Ricfried','Sigibert','Sunnegisil','Theodebert','Theodemir','Theudebald','Theuderic','Waleran','Willicar'],
    female: ['Adosinda','Amalfrida','Amalina','Avagisa','Avina','Basina','Beranhild','Brunihild','Deuteria','Gailavira','Garsendis','Geleswinta','Gelvira','Grimhild','Gunteuch','Hermesind','Heva','Hilduara','Ingund','Radegund','Sichild','Verich','Waldrada','Wisigard'],
    family: null  // Woodmen use nicknames (the Bowman, the Hound, the Wood-goer, etc.)
  },
  'Dwarves of Nogrod and Belegost': {
    // After their cities fell, they adopted names in the tradition of Durin's line.
    male: ['Ai','Anar','Beli','Bláin','Borin','Burin','Bruni','Farin','Flói','Frár','Frerin','Frór','Ginar','Gróin','Grór','Hanar','Hepti','Iari','Lófar','Lóni','Náli','Nár','Niping','Nói','Núr','Nýrád','Ónar','Póri','Regin','Svior','Veig','Vidar'],
    female: ['Adis','Afrid','Agda','Bersa','Birna','Dagrún','Dís','Drífa','Edda','Elin','Fenja','Frida','Geira','Gísla','Hadda','Hón','Ida','Ilmr','Jóra','Kára','Kóna','Lif','Linhild','Már','Mist','Nál','Oda','Ósk','Rán','Rinda','Sefa','Syn','Tóra','Trana','Úlfrún','Vírún','Yrr'],
    family: null  // Dwarves keep secret true names
  },
  'High Elves of Rivendell': {
    male: ['Aegnor','Beleg','Celegorm','Daeron','Edrahil','Fingon','Finrod','Gwindor','Mablung','Maeglin','Orodreth','Saeros'],
    female: ['Amarië','Ancalimë','Berúthiel','Celebrindal','Elwing','Finduilas','Fíriel','Idril','Lothíriel','Míriel','Nimloeth','Nimrodel'],
    family: null  // High-Elven naming conventions are far more complex; these are examples
  }
};

// Per Core Rules p.140 — flaws acquired in order at each Bout of Madness.
const FLAWS_BY_PATH = {
  'Curse of Vengeance':  ['Spiteful', 'Brutal', 'Cruel', 'Murderous'],          // Champion
  'Dragon-Sickness':     ['Grasping', 'Mistrustful', 'Deceitful', 'Thieving'],  // Treasure Hunter
  'Lure of Power':       ['Resentful', 'Arrogant', 'Overconfident', 'Tyrannical'], // Captain
  'Lure of Secrets':     ['Haughty', 'Scornful', 'Scheming', 'Traitorous'],     // Scholar
  'Path of Despair':     ['Troubled', 'Wavering', 'Guilt-ridden', 'Fearful'],   // Warden
  'Wandering-Madness':   ['Idle', 'Forgetful', 'Uncaring', 'Cowardly'],         // Messenger
  'Moria-Madness':       ['Distracted', 'Mistrustful', 'Blinded', 'Jealous']    // Moria solo (Dwarves), optional
};

const USEFUL_ITEMS = [
  { name: 'Knife & salt for cooking',          desc: 'For skinning rabbits and seasoning',     skill: 'Hunting' },
  { name: 'Coil of rope w/ grappling hook',    desc: 'For climbing tricky walls',              skill: 'Athletics' },
  { name: 'Wind-proof lantern',                desc: 'To see in fog or storm',                 skill: 'Scan' },
  { name: 'Exotic musical instrument',         desc: 'A rare flute, lyre, or drum',            skill: 'Song' },
  { name: 'Balm to soothe pain',               desc: 'Salve for tending wounds',               skill: 'Healing' },
  { name: 'Fine clothes & pearl earrings',     desc: 'For commanding attention',               skill: 'Awe', skillAlt: 'Courtesy' },
  { name: 'Liquor to infuse strength',         desc: 'A draught for rousing speeches',         skill: 'Enhearten' },
  { name: 'Sunstone',                          desc: 'To navigate in bad weather',             skill: 'Travel' },
  { name: 'Fine pipe',                         desc: 'For finding comfort and clarity',        skill: 'Insight' },
  { name: 'Detailed maps',                     desc: 'Charts of distant lands',                skill: 'Explore' },
  { name: 'Stone-carving instruments',         desc: 'Tools for fine craftwork',               skill: 'Craft' },
  { name: 'Old book of riddles',               desc: 'Notes on lore and obscure tongues',      skill: 'Riddle', skillAlt: 'Lore' }
];

const SOL_USEFUL_ITEM_COUNT = {
  'Poor': 0, 'Frugal': 1, 'Common': 2, 'Prosperous': 3, 'Rich': 4, 'Very Rich': 4
};

const PATRONS = {
  'Balin, son of Fundin': {
    callings: ['Captain', 'Champion'],
    fpBonus: 1,
    ability: 'Spend Fellowship to make a combat roll Favoured',
    agenda: 'Reclaim lost strongholds, eliminate enemy lieutenants'
  },
  'Bilbo Baggins': {
    callings: ['Treasure Hunter', 'Scholar'],
    fpBonus: 2,
    ability: 'Raise Fellowship by +1 when choosing Meet Patron undertaking to visit Bilbo',
    agenda: 'Recover lost lore and lost things'
  },
  'Cirdan the Shipwright': {
    callings: ['Messenger', 'Scholar'],
    fpBonus: 1,
    ability: 'Spend Fellowship to roll again all dice in a roll. Meet Patron undertaking grants a rumour',
    agenda: 'Rekindle hope, preserve the lore of the Ages'
  },
  'Gandalf the Grey': {
    callings: ['Messenger', 'Captain'],
    fpBonus: 2,
    ability: 'Spend Fellowship to make a Shadow Test Favoured',
    agenda: 'Warn the Free Peoples, inspire them to action'
  },
  'Gilraen, daughter of Dirhael': {
    callings: ['Champion', 'Warden'],
    fpBonus: 0,
    ability: 'Resolve Journey Events within Arnor as if in a Border Land. Meet Patron undertaking grants a rumour',
    agenda: 'Fight the Enemy, defend the weak'
  },
  'Tom Bombadil and Lady Goldberry': {
    callings: ['Warden', 'Treasure Hunter'],
    fpBonus: 2,
    ability: "Spend all your Fellowship to call Tom or Goldberry's intervention anywhere in Tom's country",
    agenda: 'Protect the land, find and preserve what was buried'
  }
};

const CALLINGS = {
  'Captain': { favoured: ['Battle','Enhearten','Persuade'], feature: 'Leadership', shadowPath: 'Lure of Power' },
  'Champion': { favoured: ['Athletics','Awe','Hunting'], feature: 'Enemy-Lore (choose: Evil Men/Orcs/Spiders/Trolls/Wargs/Undead)', shadowPath: 'Curse of Vengeance' },
  'Messenger': { favoured: ['Courtesy','Song','Travel'], feature: 'Folk-Lore', shadowPath: 'Wandering-Madness' },
  'Scholar': { favoured: ['Craft','Lore','Riddle'], feature: 'Rhymes of Lore', shadowPath: 'Lure of Secrets' },
  'Treasure Hunter': { favoured: ['Explore','Scan','Stealth'], feature: 'Burglary', shadowPath: 'Dragon-Sickness' },
  'Warden': { favoured: ['Awareness','Healing','Insight'], feature: 'Shadow-Lore', shadowPath: 'Path of Despair' },
  // Moria Shared Callings — the Player-hero & Band share one. Feature = Disposition Focus.
  'Reclaimers':       { favoured: ['Craft','Lore','Scan'],          feature: 'Disposition Focus: Expertise', shadowPath: 'Dragon-Sickness', shared: true },
  'Pathfinders':      { favoured: ['Athletics','Explore','Travel'], feature: 'Disposition Focus: Manoeuvre', shadowPath: 'Lure of Secrets', shared: true },
  'Standard-Bearers': { favoured: ['Enhearten','Persuade','Song'],  feature: 'Disposition Focus: Rally',     shadowPath: 'Lure of Power', shared: true },
  'Guardians':        { favoured: ['Awareness','Healing','Insight'],feature: 'Disposition Focus: Vigilance', shadowPath: 'Path of Despair', shared: true },
  'Vanguards':        { favoured: ['Awe','Battle','Stealth'],       feature: 'Disposition Focus: War',       shadowPath: 'Curse of Vengeance', shared: true }
};

const DEFAULT_CHARACTER = {
  name: '', culture: '', blessing: '', calling: '', shadowPath: '', shadowPathOrig: '',
  patron: '', standard: '', age: '', features: '', flaws: '',
  history: '', rewards: '', virtues: '', travel: '', hoards: '', notes: '',
  strRating: 5, strTN: 15, hrtRating: 5, hrtTN: 15, witRating: 5, witTN: 15,
  endMax: 20, endCur: 20, load: 0, fatigue: 0,
  hopeMax: 10, hopeCur: 10, shadow: 0, scars: 0,
  parry: 0, parryBonus: 0, endBonus: 0, hopeBonus: 0,
  endBonusVirtue: 0, hopeBonusVirtue: 0, parryBonusVirtue: 0,
  otherLoad: 0,
  featuresPicked: [], startingReward: '', startingVirtue: '',
  rewardsList: [], virtuesList: [],
  cultureFavoured: '', callingFavoured: [], masteryFavoured: [],
  armourRewards: [], helmRewards: [], shieldRewards: [],
  fellowshipRating: 0, prowessAttr: '',
  peSpent: 0, skillsBaseline: {}, profsBaseline: {}, safeHaven: '',
  usefulItems: [], enemyLore: '', kingsOfMenAttr: '',
  primaryProfChoice: '', secondaryProfChoice: '',
  gender: '',
  backstoryName: '', backstoryDie: 0, backstoryStory: '',
  majorEventName: '', majorEventDie: 0, majorEventText: '', greyWizard: false,
  valour: 1, wisdom: 1, fellowship: 0,
  skillPts: 0, advPts: 0, treasure: 0,
  injury: '', injuryDays: 0, firstAidUsed: false, fellowshipFocus: '', stance: '', engagedFoes: 0,
  // Combat-tab encounter tracker (works in all modes). foes: full adversary stat blocks.
  // foe = { id, name, source, endMax, endCur, might, hateMax, hateCur, parry, armour, atkTN,
  //         attacks:[{name,dice,dmg,inj,special}], fell, engaged, wounded, slain }
  encounter: { active: false, round: 1, foes: [], weaponIdx: 0, adv: { open: false, hope: false, fav: 'normal', extra: 0, keen: false } },
  // Rest day-tracker (Core Rules p.71): at most 1 Short Rest per day. A Prolonged Rest is
  // the night's sleep that ends the day — it advances dayCount, clears the Short-Rest flag,
  // and ticks a Wounded hero's injury day-count down by 1.
  dayCount: 1, shortRestUsedToday: false,
  journey: {
    active: false,
    origin: '', destination: '',
    totalHexes: 0, hardTerrainHexes: 0, currentHex: 0,
    season: 'Spring', region: 'Wild',
    forcedMarch: false, mounted: false, mountVigour: 0,
    roles: { guide: false, hunter: false, lookout: false, scout: false },
    travelFatigue: 0, daysElapsed: 0,
    events: [],
    nextEventHex: null,
    // Perilous Location (Core Rules p.114): a Peril rating queues N extra Journey
    // Events to be resolved at the location, independent of the hex path.
    perilRating: 0, perilEventsRemaining: 0
  },
  // Council state — formal social encounter tracker (Core Rules pp.104-108).
  council: {
    active: false,
    topic: '',
    resistance: 3,           // 3 | 6 | 9
    attitude: 'open',        // 'reluctant' | 'open' | 'friendly'
    introRolled: false,
    timeLimit: 0,
    attemptsUsed: 0,
    successesScored: 0,
    supportNext: false,      // a companion supports the next Interaction roll (+1d, RAW p.106)
    rolls: [],               // {skill, success, icons, contributed, bonus}
    outcome: null            // null | 'success' | 'failure' | 'woe'
  },
  // Past councils this device — persisted summaries for narrative continuity.
  councilHistory: [],        // [{topic, outcome, successesScored, resistance, attemptsUsed, when}]
  timeline: [],              // U15 — cross-session campaign log: [{ts, type, text}] (all play modes)
  // Skill Endeavour state — prolonged-task tracker (Core Rules p.131).
  skillEndeavour: {
    active: false,
    task: '',
    resistance: 3,           // 3 (Simple) | 6 (Laborious) | 9 (Daunting)
    timeLimit: 4,            // 3 | 4 | 5 | 6
    riskLevel: 'standard',   // 'standard' | 'hazardous' | 'foolish'
    attemptsUsed: 0,
    successesScored: 0,
    rolls: [],
    outcome: null            // null | 'success' | 'simple-failure' | 'woe' | 'failure-with-woe' | 'disaster'
  },
  // Active until next Fellowship Phase — cleared at the start of each FP wizard.
  activeFPBonuses: { strengthenFellowship: false, ponderMaps: false },
  // Songs composed via Write a Song undertaking. {type, title, lyrics, used (boolean — reset each Adventuring Phase)}.
  songs: [],
  // Raise an Heir (Yule) tracking.
  heir: { name: '', pe: 0 },
  // Phase count for narrative — increments each completed FP.
  phasesCompleted: 0,
  // Set true while the Fellowship Phase wizard is open — gates Spend XP cap enforcement.
  fpModeActive: false,
  // Per-current-FP spending tracker: which skills/profs already bought a rank, and Valour-XOR-Wisdom flag.
  fpSpend: { skills: {}, profs: {}, valour: 0, wisdom: 0 },
  // Set true if hero succumbs to Shadow (all 4 path Flaws + Shadow+Scars = Max Hope again).
  retired: false,
  retiredReason: '',
  // Strider Mode — solo / no-Loremaster play variant (per Strider Mode supplement).
  // Affects: PE budget (15 vs 10), TN formula (18 vs 20), Fellowship Rating (3), Strider DF,
  // Skirmish stance, Gain Ground combat task, oracle tables, Eye of Mordor.
  striderMode: false,
  // Moria Solo Mode (Moria — Through the Doors of Durin solo campaign). See the "Moria Solo Mode" section in CLAUDE.md.
  moriaMode: false,
  moriaHopeBonus: 0,            // tracked +5 max-Hope delta (band support) so disable can revert it
  // Band of Allies (Moria solo). Readiness TN = 20 − readiness. Dispositions default 2.
  band: {
    readiness: 4,
    dispositions: { expertise: 2, manoeuvre: 2, rally: 2, vigilance: 2, war: 2 },
    burden: 'medium',
    sharedCalling: '',        // Moria shared calling name
    dispositionFocus: '',     // Disposition the Band is Inspired in (from shared calling)
    allies: []  // { id, name, gift, giftDesc, quirk, hardened, injury:'', fatigue:'', outOfAction:false, kinglyGift, giftWasted }
  },
  // Mission planning (Moria solo). Composition seeds Dispositions/Burden/Readiness/EA/Hunt.
  mission: {
    active: false, objective: '',
    size: 'medium', warGear: 'prepared', specialisation: '',
    prevOutcome: '', fpDuration: 'brief',
    roster: []  // ally ids on this mission; empty = whole Band
  },
  huntMod: 0,  // Hunt Threshold modifier from prev mission + FP duration (added to region base)
  // Battle / Clash (Moria solo). Only meaningful while active.
  battle: {
    active: false, scale: '', foeMight: 1, foeResistance: 6, foeResMax: 6,
    archfoe: 'none', objective: '', objectiveRes: 0, objectiveResMax: 0,
    advantages: [], complications: [],   // each { name, persistent }
    leaderFocus: 'fight', bandStance: 'balanced', inspired: false,
    focusBonus: 0, fleeIll: false, round: 0, log: []
  },
  // Eye of Mordor (optional per Core Rules; required for Strider Mode).
  eyeAwareness: 0,
  huntRegion: 'wild',           // 'border' | 'wild' | 'dark' — sets Hunt Threshold (18/16/14)
  experienceMode: 'session',    // 'session' (default RAW) | 'milestone' (alternative)
  // Magical Treasure (Core Rules pp.158-167)
  // Each item: { type: 'Marvellous Artefact' | 'Wondrous Item' | 'Famous Weapon' | 'Famous Armour',
  //              name, blessings: [skillName, ...], craftsmanship, notes, qualities: [], dormantQualities: [] }
  magicalItems: [],
  schemaVersion: 1,  // bumped by CHARACTER_SCHEMA_VERSION only on a breaking schema change
  weary: false, miserable: false, wounded: false,
  armourProt: 0, armourLoad: 0, armourNotes: '',
  helmProt: 0, helmLoad: 0,
  shieldBase: 0, shieldTotal: 0, shieldLoad: 0, shieldNotes: '',
  openingVolley: false,  // Opening Volleys (Core Rules p.93): aware target → shield Parry doubled vs ranged
  skills: {},  // {skillName: {rating: 0, favoured: false}}
  skillNotes: {}, // {skillName: 'free-text note'} — per-skill notes (UX)
  profs: {},   // {profName: 0}
  weapons: []  // [{name, dmg, inj, load, notes}]
};
