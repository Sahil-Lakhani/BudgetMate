import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

export async function analyzeReceipt(imageFile) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const prompt = `Analyze this receipt image and extract the following information in JSON format:
{
  "merchant": "store/business name",
  "location": "store/business location",
  "total": "total amount spent (as a number)",
  "date": "transaction date (YYYY-MM-DD format)",
  "items": [
    {
      "name": "item name (translate to English ONLY if it is a real, concrete noun like fruits, vegetables, food items, or branded products; if the name is a generic category or department label, keep it as a generic English description)",
      "unit_price": "item unit price (as a number)",
	  "price": "item total price (as a number)",
      "quantity": "quantity (as a number, default 1)",
      "category": "category ("Groceries","Dining","Transport","Clothing","Household","Health","Entertainment", "Subscription","Other","Electronics"),
    }
  ]
}

Rules:
- Extract all items from the receipt
- Date should be in YYYY-MM-DD format, IMPORTANT or use today's date if not found in the image receipt
- Categorize each item appropriately ("groceries","dining","transport","clothing","household","health","entertainment", "subscription","other","electronics")
- If category is unclear, use "Other"
- Translate item names to English ONLY if they are real, concrete nouns (e.g., fruits, vegetables, food items, branded products); do NOT invent specific product names for generic department labels
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- All prices should be numbers (not strings with currency symbols)`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: imageFile.type,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
	  const jsonString = text.replace(/```json\n|\n```/g, "").trim();
	  // console.log(jsonString);
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}

export async function generateMonthlyInsights(transactions) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a personal finance assistant.

Analyze the following previous month transaction data and generate exactly 3 to 4 highly specific, numerical, and actionable money-saving suggestions.

Each suggestion MUST:
- Be strictly based on the provided data (no assumptions)
- Include real numbers from the data (prices, totals, differences, counts)
- Include a clear action the user can take
- Include a realistic estimated saving amount
- Focus on:
  • Price comparisons (same product across stores)
  • Repeatedly bought items
  • Category overspending
  • Pfand (deposit) recovery
  • Drink/snack cutbacks

DO NOT:
- Give generic advice
- Repeat the same type of suggestion twice
- Mention budgeting theory
- Mention percentages without real euro amounts

Return the result in the following JSON format:

{
  "suggestions": [
    {
      "title": "Short title (max 6 words)",
      "insight": "What exactly happened based on the data make it short and to the point",
      "action": "What the user should do",
      "estimated_saving_per_month": "number in euros"
    }
  ]
}

Here is the previous month transaction data:
${JSON.stringify(transactions)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json\n|\n```/g, "").trim();
    // console.log(jsonString);
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating monthly insights:", error);
    throw error;
  }
}
