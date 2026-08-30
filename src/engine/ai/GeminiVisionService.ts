/**
 * Optional Gemini Cloud AI Vision Enhancement Service
 * Enhances semantic region understanding when configured by the user.
 * Falls back transparently to local computer vision when offline or unconfigured.
 */
export class GeminiVisionService {
  private static STORAGE_KEY = 'lumina_gemini_api_key';

  public static getApiKey(): string | null {
    return localStorage.getItem(this.STORAGE_KEY) || null;
  }

  public static setApiKey(key: string): void {
    if (!key.trim()) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, key.trim());
    }
  }

  public static isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 10;
  }

  /**
   * Request semantic bounding guidance from Gemini for a specific target.
   */
  public static async analyzeTargetRegion(
    base64Jpg: string,
    target: string
  ): Promise<{ box?: [number, number, number, number]; description?: string } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this image and identify the bounding box coordinates [ymin, xmin, ymax, xmax] normalized from 0 to 1000 for the primary ${target}. Return ONLY valid JSON: {"box": [ymin, xmin, ymax, xmax]}`
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Jpg.replace(/^data:image\/[a-z]+;base64,/, '')
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json'
            }
          })
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.box) && parsed.box.length === 4) {
        return {
          box: [
            parsed.box[0] / 1000,
            parsed.box[1] / 1000,
            parsed.box[2] / 1000,
            parsed.box[3] / 1000
          ]
        };
      }
      return null;
    } catch (e) {
      console.warn('[Gemini Vision] Cloud analysis skipped, using local engine:', e);
      return null;
    }
  }
}
