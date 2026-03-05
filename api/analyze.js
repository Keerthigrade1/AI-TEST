const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

    const payload = JSON.stringify({
      contents: [{ parts: [
        { text: `You are a vehicle damage inspector. Compare CHECKOUT vs RETURN photo and identify NEW damage. Respond ONLY in raw JSON: {"hasDamage":true,"overallSeverity":"HIGH","averageConfidence":85,"estimatedRepairMin":200,"estimatedRepairMax":500,"summary":"summary here","damages":[{"type":"Scratch","location":"front bumper","severity":"MEDIUM","confidence":85,"estimatedCost":300}]}` },
        { text: "CHECKOUT PHOTO:" },
        { inline_data: { mime_type: body.beforeType || 'image/jpeg', data: body.beforeImage } },
        { text: "RETURN PHOTO:" },
        { inline_data: { mime_type: body.afterType || 'image/jpeg', data: body.afterImage } }
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
    });

    const result = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      }, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ status: r.statusCode, body: d })); });
      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    res.status(result.status).json(JSON.parse(result.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
