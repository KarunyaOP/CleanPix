import { DetectedCategory } from "@/types/schema";

export interface SubjectDetectionOptions {
  fileName?: string;
  faces?: any[];
  tags?: string[];
  colors?: any[];
  illustrationScore?: number;
  width?: number;
  height?: number;
}

/**
 * Robust Multi-Layered AI Subject Classification Engine (Phase 2)
 * 
 * Hierarchy:
 * 1. FACE DETECTION: If human face(s) are detected by server AI -> "person"
 * 2. SPECIFIC SUBJECT KEYWORDS: Evaluated in order:
 *    - Document / Invoice / Receipt -> "document"
 *    - Logo / Brand / Icon -> "logo"
 *    - Screenshot / Capture -> "screenshot"
 *    - Food / Beverage / Meal -> "food"
 *    - Illustration / Artwork / Vector -> "illustration"
 *    - Pet / Animal -> "pet"
 *    - Vehicle / Transport -> "vehicle"
 *    - Person / Portrait -> "person"
 *    - Standalone Product -> "product"
 *    - General Objects -> "other"
 * 3. GEOMETRY / DIMENSION HEURISTICS:
 *    - Small icons (<= 256px) -> "logo"
 *    - Ultra-widescreen (>= 2.2 ratio) -> "screenshot"
 *    - Ultra-tall vertical (<= 0.5 ratio) -> "document"
 *    - Square / Near-Square (0.9 - 1.1) -> "product"
 * 4. DEFAULT FALLBACK: "other" (never hardcoded to "person")
 */
export function classifyImageSubject(options: SubjectDetectionOptions): DetectedCategory {
  const { faces = [], fileName = "", tags = [], width, height } = options;
  const lower = fileName.toLowerCase().replace(/[^a-z0-9_\-\.]/g, " ");

  // 1. HIGHEST PRIORITY: If Cloudinary face detection found human face(s) -> PERSON
  if (faces && Array.isArray(faces) && faces.length > 0) {
    return "person";
  }

  // 2. Document & Paperwork Keywords
  const documentKeywords = [
    "invoice",
    "receipt",
    "document",
    "pdf",
    "paper",
    "contract",
    "text",
    "letter",
    "file",
    "sheet",
    "form",
    "certificate",
    "scan",
    "doc",
    "report",
    "bill",
    "statement",
    "ticket",
    "card",
    "passport",
    "license",
    "menu",
    "memo",
    "chart",
    "graph",
    "diagram",
    "spreadsheet",
    "table",
  ];

  for (const kw of documentKeywords) {
    if (lower.includes(kw)) {
      return "document";
    }
  }

  // 3. Logo & Brand Mark Keywords
  const logoKeywords = [
    "logo",
    "icon",
    "brand",
    "emblem",
    "symbol",
    "mark",
    "badge",
    "insignia",
    "monogram",
    "favicon",
    "crest",
    "seal",
    "watermark",
    "logotype",
    "wordmark",
    "appicon",
    "pictogram",
    "brandmark",
  ];

  for (const kw of logoKeywords) {
    if (lower.includes(kw)) {
      return "logo";
    }
  }

  // 4. Screenshot & UI Capture Keywords
  const screenshotKeywords = [
    "screenshot",
    "capture",
    "screen",
    "display",
    "snapshot",
    "screengrab",
    "screencap",
    "window",
    "ui",
    "dashboard",
    "app_screen",
    "webpage",
    "desktop_capture",
    "mobile_screen",
  ];

  for (const kw of screenshotKeywords) {
    if (lower.includes(kw)) {
      return "screenshot";
    }
  }

  // 5. Food & Dining Keywords
  const foodKeywords = [
    "food",
    "pizza",
    "burger",
    "meal",
    "restaurant",
    "dish",
    "snack",
    "bread",
    "fruit",
    "vegetable",
    "cooking",
    "chef",
    "dessert",
    "tea",
    "drink",
    "cafe",
    "cuisine",
    "lunch",
    "dinner",
    "breakfast",
    "cake",
    "coffee",
    "beverage",
    "sushi",
    "pasta",
    "steak",
    "bakery",
    "sandwich",
    "cocktail",
    "wine",
    "beer",
    "soup",
    "salad",
    "icecream",
    "chocolate",
    "cheese",
    "cookie",
    "donut",
    "pastry",
  ];

  for (const kw of foodKeywords) {
    if (lower.includes(kw)) {
      return "food";
    }
  }

  // 6. Illustration & Digital Artwork Keywords
  const illustrationKeywords = [
    "drawing",
    "artwork",
    "illustration",
    "vector",
    "anime",
    "cartoon",
    "sketch",
    "doodle",
    "render",
    "3d_render",
    "graphic",
    "clip_art",
    "clipart",
    "painting",
    "sticker",
    "comic",
    "manga",
    "digital_art",
    "character_design",
    "mascot",
    "watercolor",
    "caricature",
  ];

  for (const kw of illustrationKeywords) {
    if (lower.includes(kw)) {
      return "illustration";
    }
  }

  // 7. Pet / Domestic Animal Keywords
  const petKeywords = [
    "dog",
    "cat",
    "pet",
    "puppy",
    "kitten",
    "animal",
    "canine",
    "feline",
    "bird",
    "parrot",
    "hamster",
    "rabbit",
    "bunny",
    "horse",
    "fish",
    "hound",
    "retriever",
    "shepherd",
    "bulldog",
    "poodle",
    "terrier",
    "husky",
    "pug",
    "beagle",
    "chihuahua",
    "tabby",
    "siamese",
    "persian",
    "wildlife",
    "zoo",
    "duck",
    "eagle",
    "owl",
    "turtle",
  ];

  for (const kw of petKeywords) {
    if (lower.includes(kw)) {
      return "pet";
    }
  }

  // 8. Vehicle / Transport Keywords
  const vehicleKeywords = [
    "car",
    "vehicle",
    "auto",
    "automobile",
    "motorcycle",
    "bike",
    "bicycle",
    "scooter",
    "truck",
    "bus",
    "van",
    "suv",
    "sedan",
    "coupe",
    "convertible",
    "supercar",
    "aircraft",
    "plane",
    "airplane",
    "helicopter",
    "boat",
    "yacht",
    "ship",
    "train",
    "tesla",
    "bmw",
    "audi",
    "mercedes",
    "ford",
    "toyota",
    "honda",
    "porsche",
    "ferrari",
    "lamborghini",
  ];

  for (const kw of vehicleKeywords) {
    if (lower.includes(kw)) {
      return "vehicle";
    }
  }

  // 9. Person / Portrait Keywords
  const personKeywords = [
    "person",
    "human",
    "man",
    "woman",
    "girl",
    "boy",
    "people",
    "portrait",
    "selfie",
    "face",
    "model",
    "profile",
    "avatar",
    "headshot",
    "lady",
    "guy",
    "child",
    "kid",
    "baby",
    "teen",
    "couple",
    "fashion",
    "dancer",
    "athlete",
    "fitness",
    "worker",
    "doctor",
    "teacher",
    "student",
    "hero-original",
    "hero-cutout",
    "hero_model",
    "demo_portrait",
    "demo_person",
    "portrait_isolated",
    "portrait_original",
    "bride",
    "groom",
    "actor",
    "actress",
  ];

  for (const kw of personKeywords) {
    if (lower.includes(kw)) {
      return "person";
    }
  }

  // 10. Standalone Product Keywords
  const productKeywords = [
    "shoe",
    "sneaker",
    "boot",
    "sandal",
    "bag",
    "handbag",
    "backpack",
    "purse",
    "wallet",
    "watch",
    "wristwatch",
    "bottle",
    "perfume",
    "cosmetic",
    "lotion",
    "shampoo",
    "phone",
    "smartphone",
    "iphone",
    "laptop",
    "gadget",
    "headphone",
    "earbuds",
    "speaker",
    "furniture",
    "chair",
    "sofa",
    "table",
    "lamp",
    "product",
    "item",
    "merchandise",
    "ecommerce",
    "skincare",
    "cup",
    "mug",
    "box",
    "package",
    "thumb-bag",
    "thumb-shoe",
    "jewelry",
    "necklace",
    "ring",
    "earring",
    "glasses",
    "sunglasses",
  ];

  for (const kw of productKeywords) {
    if (lower.includes(kw)) {
      return "product";
    }
  }

  // 11. Check tags if present from metadata / external Vision
  if (tags && tags.length > 0) {
    const joinedTags = tags.join(" ").toLowerCase();
    for (const kw of documentKeywords) if (joinedTags.includes(kw)) return "document";
    for (const kw of logoKeywords) if (joinedTags.includes(kw)) return "logo";
    for (const kw of screenshotKeywords) if (joinedTags.includes(kw)) return "screenshot";
    for (const kw of foodKeywords) if (joinedTags.includes(kw)) return "food";
    for (const kw of illustrationKeywords) if (joinedTags.includes(kw)) return "illustration";
    for (const kw of petKeywords) if (joinedTags.includes(kw)) return "pet";
    for (const kw of vehicleKeywords) if (joinedTags.includes(kw)) return "vehicle";
    for (const kw of personKeywords) if (joinedTags.includes(kw)) return "person";
    for (const kw of productKeywords) if (joinedTags.includes(kw)) return "product";
  }

  // 12. Geometric & Dimension-Based Heuristics
  if (width && height && width > 0 && height > 0) {
    const ratio = width / height;

    // Small dimensions (icons, logos, favicons)
    if (width <= 256 && height <= 256) {
      return "logo";
    }

    // Ultra-widescreen (e.g. desktop screenshots or wide banners)
    if (ratio >= 2.2) {
      return "screenshot";
    }

    // Ultra-tall vertical (e.g. mobile receipts or tall document captures)
    if (ratio <= 0.45) {
      return "document";
    }

    // Square or near-square images with no face are standard e-commerce product framing
    if (ratio >= 0.9 && ratio <= 1.1) {
      return "product";
    }
  }

  // 13. Clean, Safe Default Fallback
  return "other";
}
