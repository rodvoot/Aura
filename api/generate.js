const ALLOWED_MODELS = new Set([
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'gemini-3.1-flash-lite-image',
]);
const ALLOWED_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);
const ALLOWED_SIZES = new Set(['1K', '2K', '4K']);
const MAX_PROMPT_LENGTH = 12000;
const MAX_REFERENCE_COUNT = 5;
const MAX_REFERENCE_DATA_LENGTH = 620000;

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

function getHeader(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async function generate(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Only POST requests are supported.');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 503, 'Image generation is not configured. Add GEMINI_API_KEY to the server environment.');

  const configuredPassword = process.env.AURA_ACCESS_PASSWORD;
  if (configuredPassword && getHeader(req, 'x-aura-access-password') !== configuredPassword) {
    return sendError(res, 401, 'Invalid Aura access password.');
  }

  const body = req.body;
  if (!body || typeof body !== 'object') return sendError(res, 400, 'A JSON request body is required.');

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const model = typeof body.model === 'string' ? body.model : 'gemini-3.1-flash-image';
  const aspectRatio = typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16';
  const imageSize = typeof body.imageSize === 'string' ? body.imageSize : '1K';
  const references = Array.isArray(body.references) ? body.references : [];

  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return sendError(res, 400, `Prompt must be between 1 and ${MAX_PROMPT_LENGTH} characters.`);
  if (!ALLOWED_MODELS.has(model)) return sendError(res, 400, 'Unsupported image model.');
  if (!ALLOWED_RATIOS.has(aspectRatio)) return sendError(res, 400, 'Unsupported aspect ratio.');
  if (!ALLOWED_SIZES.has(imageSize) || (model === 'gemini-3.1-flash-lite-image' && imageSize !== '1K')) return sendError(res, 400, 'Unsupported image size for this model.');
  if (references.length > MAX_REFERENCE_COUNT) return sendError(res, 400, 'A maximum of 5 reference images is supported.');

  const referenceParts = [];
  for (const reference of references) {
    if (!reference || !['image/jpeg', 'image/png', 'image/webp'].includes(reference.mimeType) || typeof reference.data !== 'string' || reference.data.length > MAX_REFERENCE_DATA_LENGTH || !/^[A-Za-z0-9+/=]+$/.test(reference.data)) {
      return sendError(res, 400, 'One or more reference images are invalid or too large.');
    }
    referenceParts.push({ inlineData: { mimeType: reference.mimeType, data: reference.data } });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: 'user', parts: [...referenceParts, { text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, imageSize } },
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = result.error?.message || `Gemini request failed (${upstream.status}).`;
      return sendError(res, upstream.status >= 500 ? 502 : upstream.status, message);
    }

    const parts = result.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    if (!imagePart) return sendError(res, 502, 'Gemini returned no image. Try a simpler prompt or another model.');
    return res.status(200).json({ image: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType || 'image/png' });
  } catch (error) {
    console.error('[aura] Gemini request failed:', error);
    return sendError(res, 502, 'Could not reach the image generation service.');
  }
};
