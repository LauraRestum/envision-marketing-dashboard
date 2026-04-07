import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('startDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Campaigns listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addCampaign(campaign) {
    await addDoc(collection(db, 'campaigns'), {
      name: campaign.name,
      slug: campaign.slug || '',
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      platforms: campaign.platforms || [],
      color: campaign.color || '#003087',
      description: campaign.description || '',
      createdAt: new Date().toISOString(),
    });
  }

  async function updateCampaign(id, updates) {
    await updateDoc(doc(db, 'campaigns', id), updates);
  }

  async function removeCampaign(id) {
    await deleteDoc(doc(db, 'campaigns', id));
  }

  return { campaigns, loading, addCampaign, updateCampaign, removeCampaign };
}
