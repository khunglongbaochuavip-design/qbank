// src/hooks/useMasterData.js
import { useState, useEffect } from 'react';
import api from '../api/client';

let cache = null;
let promise = null;

async function fetchAll() {
  const [subjects, domains, topics, gradeLevels, cognitiveLevels, difficultyLevels, tags] = await Promise.all([
    api.get('/master/subjects').then(r => r.data),
    api.get('/master/domains').then(r => r.data),
    api.get('/master/topics').then(r => r.data),
    api.get('/master/grade-levels').then(r => r.data),
    api.get('/master/cognitive-levels').then(r => r.data),
    api.get('/master/difficulty-levels').then(r => r.data),
    api.get('/master/tags').then(r => r.data),
  ]);
  return { subjects, domains, topics, gradeLevels, cognitiveLevels, difficultyLevels, tags };
}

export function useMasterData() {
  const [data, setData] = useState(cache || { subjects: [], domains: [], topics: [], gradeLevels: [], cognitiveLevels: [], difficultyLevels: [], tags: [] });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) { setData(cache); setLoading(false); return; }
    if (!promise) promise = fetchAll();
    promise.then(d => { cache = d; setData(d); }).finally(() => setLoading(false));
  }, []);

  const invalidate = () => { cache = null; promise = null; };

  return { ...data, loading, invalidate };
}
