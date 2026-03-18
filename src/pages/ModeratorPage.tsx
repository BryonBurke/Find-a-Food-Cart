import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, FileText, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function ModeratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [deletedPods, setDeletedPods] = useState<any[]>([]);
  const [deletedCarts, setDeletedCarts] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        
        fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
          setLogs(data);
          setLoadingLogs(false);
        }).catch(err => {
          console.error("Failed to fetch logs:", err);
          setLoadingLogs(false);
        });

        fetch('/api/ownership_requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
          setRequests(data);
          setLoadingRequests(false);
        }).catch(err => {
          console.error("Failed to fetch requests:", err);
          setLoadingRequests(false);
        });

        fetch('/api/deleted_content', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
          setDeletedPods(data.pods || []);
          setDeletedCarts(data.carts || []);
          setLoadingDeleted(false);
        }).catch(err => {
          console.error("Failed to fetch deleted content:", err);
          setLoadingDeleted(false);
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user]);

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/ownership_requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const restoreContent = async (type: 'pod' | 'cart', id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/restore/${type}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (type === 'pod') setDeletedPods(prev => prev.filter(p => p.id !== id));
        else setDeletedCarts(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || user.email?.toLowerCase() !== 'bryonparis@gmail.com') {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-200 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Moderator Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Check className="text-emerald-600" /> Ownership Requests
            </h2>
            {loadingRequests ? <div className="animate-pulse h-20 bg-stone-100 rounded-xl" /> : (
              <div className="space-y-4">
                {requests.length === 0 ? <p className="text-stone-400 italic">No pending requests</p> : requests.map(req => (
                  <div key={req.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="font-bold text-stone-900">{req.cartName}</div>
                    <div className="text-sm text-stone-500 mb-3">Requested by: {req.userEmail}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequestAction(req.id, 'approve')} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Approve</button>
                      <button onClick={() => handleRequestAction(req.id, 'reject')} className="flex-1 bg-stone-200 text-stone-700 py-2 rounded-xl text-sm font-bold hover:bg-stone-300 transition-colors">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trash2 className="text-rose-600" /> Deleted Content
            </h2>
            {loadingDeleted ? <div className="animate-pulse h-20 bg-stone-100 rounded-xl" /> : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase mb-3">Pods</h3>
                  {deletedPods.length === 0 ? <p className="text-xs text-stone-400">No deleted pods</p> : deletedPods.map(pod => (
                    <div key={pod.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl mb-2">
                      <span className="font-semibold text-stone-800">{pod.name}</span>
                      <button onClick={() => restoreContent('pod', pod.id)} className="text-xs font-bold text-rose-600 hover:underline">Restore</button>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-400 uppercase mb-3">Carts</h3>
                  {deletedCarts.length === 0 ? <p className="text-xs text-stone-400">No deleted carts</p> : deletedCarts.map(cart => (
                    <div key={cart.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl mb-2">
                      <span className="font-semibold text-stone-800">{cart.name}</span>
                      <button onClick={() => restoreContent('cart', cart.id)} className="text-xs font-bold text-rose-600 hover:underline">Restore</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="text-blue-600" /> Activity Logs
          </h2>
          {loadingLogs ? <div className="animate-pulse h-64 bg-stone-100 rounded-xl" /> : (
            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
              {logs.map((log, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-xl text-xs border border-stone-100">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-stone-700">{log.action}</span>
                    <span className="text-stone-400">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-stone-500 truncate">User: {log.userEmail}</div>
                  <div className="text-stone-400 mt-1 italic">{JSON.stringify(log.details)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
