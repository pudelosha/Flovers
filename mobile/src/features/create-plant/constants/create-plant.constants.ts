import type { PopularPlant, Suggestion, LocationCategory } from "../types/create-plant.types";

// Header tint (consistent with your app)
export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// ---------- Popular plants (mock) ----------
export const POPULAR_PLANTS: PopularPlant[] = [
  { id: "p1", name: "Monstera", latin: "Monstera deliciosa", image: "https://images.unsplash.com/photo-1551970634-747846a548cb?w=400", tags: ["white-balance-sunny","leaf","water"] },
  { id: "p2", name: "Fiddle Leaf Fig", latin: "Ficus lyrata", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400", tags: ["white-balance-sunny","leaf","sprout"] },
  { id: "p3", name: "Aloe Vera", latin: "Aloe vera", image: "https://images.unsplash.com/photo-1589739900266-43b89b3e2c88?w=400", tags: ["white-balance-sunny","water-off","cactus"] },
  { id: "p4", name: "Orchid", latin: "Phalaenopsis", image: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=400", tags: ["white-balance-sunny","water","flower"] },
  { id: "p5", name: "Dracaena", latin: "Dracaena fragrans", image: "https://images.unsplash.com/photo-1614597341694-bd2b55a0b0b9?w=400", tags: ["white-balance-sunny","sprout"] },
  { id: "p6", name: "Snake Plant", latin: "Sansevieria trifasciata", image: "https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=400", tags: ["white-balance-sunny","water-off"] },
  { id: "p7", name: "Peace Lily", latin: "Spathiphyllum", image: "https://images.unsplash.com/photo-1614594821361-1b98b5eb2d4a?w=400", tags: ["water","flower"] },
  { id: "p8", name: "Pothos", latin: "Epipremnum aureum", image: "https://images.unsplash.com/photo-1617093727343-374b9d0f33e3?w=400", tags: ["sprout","water"] },
  { id: "p9", name: "Rubber Plant", latin: "Ficus elastica", image: "https://images.unsplash.com/photo-1601412436009-d964bd89a5e3?w=400", tags: ["white-balance-sunny","leaf"] },
  { id: "p10", name: "ZZ Plant", latin: "Zamioculcas zamiifolia", image: "https://images.unsplash.com/photo-1598899134739-24b5c2f2a1b9?w=400", tags: ["water-off","sprout"] },
];

export const SUGGESTIONS: Suggestion[] = POPULAR_PLANTS.map((p, i) => ({
  id: `s-${i + 1}`,
  name: p.name,
  latin: p.latin,
}));

// ---------- Step 2 mock profile ----------
export const PLANT_PROFILES_MOCK = {
  generic: {
    image: "https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=1200",
    description:
      "General indoor plant that prefers bright, indirect light and moderate watering. Keep out of cold drafts.",
    traits: [
      { key: "sun", value: "Bright, indirect" },
      { key: "soil", value: "Well-draining" },
      { key: "temp", value: "18–26°C" },
      { key: "humidity", value: "Medium–High" },
      { key: "difficulty", value: "Easy" },
      { key: "toxic", value: "Non-toxic" },
      { key: "watering", value: "Weekly" },
      { key: "moisture", value: "Mist sometimes" },
    ],
  },
};

export const TRAIT_ICON_BY_KEY: Record<string, string> = {
  sun: "white-balance-sunny",
  soil: "shovel",
  temp: "thermometer",
  humidity: "water-percent",
  difficulty: "star-outline",
  toxic: "alert-octagon-outline",
  watering: "water",
  moisture: "spray-bottle",
};

export const TRAIT_LABEL_BY_KEY: Record<string, string> = {
  sun: "Sun exposure",
  soil: "Soil",
  temp: "Temperature",
  humidity: "Humidity",
  difficulty: "Difficulty",
  toxic: "Toxic?",
  watering: "Watering",
  moisture: "Moisture",
};

// ---------- Step 3 predefined location suggestions ----------
export const PREDEFINED_LOCATIONS: Record<LocationCategory, string[]> = {
  indoor: [
    "Living room", "Kitchen", "Dining room", "Bedroom",
    "Bathroom", "Hallway", "Office", "Kids room",
  ],
  outdoor: [
    "Balcony", "Terrace", "Backyard", "Front yard",
    "Patio", "Garden bed", "Greenhouse", "Porch",
  ],
  other: [], // no chips requested here
};
