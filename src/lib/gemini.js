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
      "name": "item name",
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
	  console.log(jsonString);
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
}
