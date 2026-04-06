const TORN_WORDS = [
    "ghost",
    "pixel",
    "shadow",
    "ninja",
    "candy",
    "pyramid",
    "dragon",
    "storm",
    "thief",
    "hunter",
    "warrior",
    "knight",
    "mage",
    "rogue",
    "slayer",
    "demon",
    "angel",
    "spirit",
    "phantom",
    "vortex",
    "crystal",
    "emerald",
    "ruby",
    "sapphire",
    "diamond",
    "platinum",
    "gold",
    "silver",
    "bronze",
    "iron",
    "steel",
    "titanium",
    "obsidian",
    "aurora",
    "nebula",
    "cosmos",
    "galaxy",
    "comet",
    "meteor",
    "asteroid",
    "planet",
    "starfire",
    "icewing",
    "fireball",
    "thunder",
    "lightning",
    "blizzard",
    "hurricane",
    "tornado",
    "earthquake",
    "volcano",
    "avalanche",
    "tsunami",
    "eclipse",
    "horizon",
    "infinity",
    "eternal",
    "oblivion",
    "sanctum",
    "citadel",
    "fortress",
    "dungeon",
    "labyrinth",
    "abyss",
    "void",
    "realm",
    "kingdom",
    "empire",
    "dynasty",
    "legacy",
    "fate",
    "destiny",
    "prophecy",
    "omen",
    "curse",
    "blessing",
    "rune",
    "spell",
    "charm",
    "amulet",
    "talisman",
    "scepter",
    "crown",
    "throne",
    "banner",
    "flag",
    "shield",
    "sword",
    "dagger",
    "arrow",
    "bow",
    "staff",
    "wand",
    "orb",
    "ring",
    "chain",
    "cloak",
    "mask",
    "helm",
    "armor",
    "chainmail",
    "leather",
    "vest",
    "scarf",
    "gauntlet",
    "boots",
    "quartzite",
    "chert",
    "basalt",
    "chalcedony",
    "quartz",
    "snowman",
    "painting",
    "grinder",
];

export function getTornWords(): readonly string[] {
    return TORN_WORDS;
}

export function addTornWord(word: string): void {
    const normalized = word.toLowerCase().trim();
    if (normalized && !TORN_WORDS.includes(normalized)) {
        TORN_WORDS.push(normalized);
    }
}

export function removeTornWord(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    const index = TORN_WORDS.indexOf(normalized);
    if (index > -1) {
        TORN_WORDS.splice(index, 1);
        return true;
    }
    return false;
}

function getRandomWord(): string {
    return TORN_WORDS[Math.floor(Math.random() * TORN_WORDS.length)];
}

function generateUniqueId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function generateSecretToken(): string {
    const word1 = getRandomWord();
    const word2 = getRandomWord();
    const word3 = getRandomWord();
    return `${word1}-${word2}-${word3}`;
}

export function generateVerificationToken(): string {
    return generateUniqueId();
}

export function hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
