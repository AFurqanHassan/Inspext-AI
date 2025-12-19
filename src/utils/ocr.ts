import { createWorker, createScheduler, type Scheduler } from "tesseract.js";

export interface ExtractedData {
  imageName: string;
  plusCode: string;
  latitude: string;
  longitude: string;
  timestamp: string;
  originalText: string;
}

let scheduler: Scheduler | null = null;
const WORKER_COUNT = 3;

const getScheduler = async () => {
  if (scheduler) return scheduler;
  
  scheduler = createScheduler();
  const workerInitializers = Array.from({ length: WORKER_COUNT }, async () => {
    const worker = await createWorker("eng");
    scheduler!.addWorker(worker);
    return worker;
  });

  await Promise.all(workerInitializers);
  return scheduler;
};

export const processImage = async (file: File): Promise<ExtractedData> => {
  const tsScheduler = await getScheduler();
  const imageUrl = URL.createObjectURL(file);

  try {
    const { data: { text } } = await tsScheduler.addJob("recognize", imageUrl) as { data: { text: string } };
    URL.revokeObjectURL(imageUrl);

    // Normalize whitespace: Tesseract sometimes replaces symbols or adds weird characters
    const normalizedText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

    // --- Enhanced Extraction Patterns ---

    // 1. Plus Code & Address
    // First, find the Plus Code
    const simplePlusCodeRegex = /[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}/i;
    const plusCodeMatch = normalizedText.match(simplePlusCodeRegex);
    let finalPlusCode = "Not found";
    
    if (plusCodeMatch) {
      const pc = plusCodeMatch[0].trim();
      // Look for everything after the plus code until coordinate-like words or significant noise
      // We look ahead for "Lat", "Long", numbers with degrees, etc.
      const afterMatch = normalizedText.split(pc)[1] || "";
      const addressCleanupRegex = /^(?:[\s,]+[A-Za-z0-9]{2,}(?:[\s,]+[A-Za-z0-9]{2,})*)*/;
      const addressSuffix = afterMatch.match(addressCleanupRegex);
      
      finalPlusCode = pc + (addressSuffix ? addressSuffix[0].replace(/[,\s]+$/, "") : "");
    }

    // 2. Coordinates: Robust Range-Based Heuristic (Pakistan Context)
    // Extract all numbers that look like coordinates
    const allNumbersRegex = /-?\d{1,3}[.,]\d{3,12}/g;
    const potentialCoords = (normalizedText.match(allNumbersRegex) || []).map(n => parseFloat(n.replace(',', '.')));
    
    let latitude = "Not found";
    let longitude = "Not found";

    // Filtering for Pakistan ranges: Lat ~23-37, Lon ~60-78
    const latCandidates = potentialCoords.filter(n => n >= 23 && n <= 37);
    const lonCandidates = potentialCoords.filter(n => n >= 60 && n <= 78);

    if (latCandidates.length > 0) latitude = latCandidates[0].toString();
    if (lonCandidates.length > 0) longitude = lonCandidates[0].toString();

    // 3. Robust Timestamp Extraction (Multi-Format)
    const timestampPatterns = [
      /(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM))\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i, // Time Date
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)/i, // Date Time
      /(\d{2}:\d{2}(?::\d{2})?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,                // 24h Time Date
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{2}:\d{2}(?::\d{2})?)/i                 // Date 24h Time
    ];

    let finalTimestamp = "Not found";
    for (const pattern of timestampPatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        finalTimestamp = `${match[1]} ${match[2]}`.trim();
        break;
      }
    }

    return {
      imageName: file.name,
      plusCode: finalPlusCode,
      latitude,
      longitude,
      timestamp: finalTimestamp,
      originalText: text,
    };
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    console.error("OCR Error:", error);
    throw error;
  }
};
