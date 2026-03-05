const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    const payload = JSON.stringify({
      contents: [{
        parts: [
          {
            text: `You are an expert vehicle/equipment damage inspector for a rental company.
You will be shown two photos: first is the CHECKOUT photo (before rental), second is the RETURN photo (after rental).
Compare them carefully and identify any NEW damage on the returned vehicle.

Respond ONLY in valid JSON with no markdown, no backticks, just raw JSON:
{
  "hasDamage": true or false,
  "overallSeverity": "HIGH" or "MEDIUM" or "LOW" or "NONE",
  "averageConfidence": number between 0 and 100,
  "estimatedRepairMin": number in USD,
  "estimatedRepairMax": number in USD,
  "summary": "2-3 sentence professional summary",
  "damages": [
    {
      "type": "Dent or Scratch or Crack or etc",
      "location": "specific location on vehicle",
      "severity": "HIGH" or "MEDIUM" or "LOW",
      "confidence": number between 0 and 100,
      "estimatedCost": number in USD
    }
  ]
}`
          },
          { text: "CHECKOUT PHOTO (before rental):" },
          {
            inline_data: {
              mime_type: body.beforeType || 'image/jpeg',
              data: body.beforeImage
            }
          },
          { text: "RETURN PHOTO (after rental):" },
          {
            inline_data: {
              mime_type: body.afterType || 'image/jpeg',
              data: body.afterImage
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req2 = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });

      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    const geminiData = JSON.parse(result.body);
    res.status(result.status).json(geminiData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
