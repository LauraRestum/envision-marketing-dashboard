import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('scheduledDate', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Posts listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function addPost(post) {
    await addDoc(collection(db, 'posts'), {
      platforms: post.platforms || [],
      scheduledDate: post.scheduledDate || '',
      copy: post.copy || '',
      assetNote: post.assetNote || '',
      campaign: post.campaign || null,
      status: post.status || 'draft',
      assignedTo: post.assignedTo || null,
      notes: post.notes || '',
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
    });
  }

  async function updatePost(id, updates) {
    await updateDoc(doc(db, 'posts', id), updates);
  }

  async function removePost(id) {
    await deleteDoc(doc(db, 'posts', id));
  }

  function getPostsForDate(dateStr) {
    return posts.filter((p) => p.scheduledDate && p.scheduledDate.startsWith(dateStr));
  }

  function getPostsForPlatform(platform) {
    return posts.filter((p) => (p.platforms || []).includes(platform));
  }

  function getPendingApproval() {
    return posts.filter((p) => p.status === 'needs_approval');
  }

  return { posts, loading, addPost, updatePost, removePost, getPostsForDate, getPostsForPlatform, getPendingApproval };
}
