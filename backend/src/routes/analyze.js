import express from 'express';
import { deepAnalyzeText } from '../services/ai.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const result = await deepAnalyzeText(text);
    if (!result) {
      throw new Error('AI analysis returned no result or failed');
    }

    res.json({
      emotion: result.emotion,
      keywords: result.tags
    });
  } catch (error) {
    console.error('AI Analysis Error:', error.message || error);
    res.status(500).json({ error: 'Failed to analyze text', details: error.message });
  }
});

export default router;
