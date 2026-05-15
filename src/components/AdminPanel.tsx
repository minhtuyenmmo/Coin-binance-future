import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, KeyRound, Trash2, Plus, MonitorSmartphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState<{ id: string; deviceId?: string; note?: string; createdAt: number }[]>([]);
  const [newPass, setNewPass] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user && user.email === 'minhtuyenmmokg@gmail.com') {
        setIsAdmin(true);
        loadPasswords();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loadPasswords = () => {
    setLoading(true);
    return onSnapshot(collection(db, 'vip_passwords'), (snapshot) => {
      const p = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];
      p.sort((a, b) => b.createdAt - a.createdAt);
      setPasswords(p);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/unauthorized-domain') {
        alert('Lỗi: Tên miền chưa được cấp quyền. Vui lòng thêm tên miền này vào danh sách Authorized Domains trong Firebase Console -> Authentication -> Settings -> Authorized domains.');
      } else if (e.code === 'auth/popup-closed-by-user') {
        alert('Đăng nhập bị hủy.');
      } else {
        alert(`Đăng nhập thất bại: ${e.message}\nThử mở web ở Tab mới (mũi tên góc trên bên phải) nếu bạn đang xem trong khung preview.`);
      }
    }
  };

  const handleAdd = async () => {
    if (!newPass.trim()) return;
    try {
      await setDoc(doc(db, 'vip_passwords', newPass.trim()), {
        createdAt: Date.now(),
        deviceId: '',
        note: newNote.trim()
      });
      setNewPass('');
      setNewNote('');
    } catch (e) {
      console.error(e);
      alert('Lỗi thêm mật khẩu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Xóa mật khẩu ${id}?`)) return;
    try {
      await deleteDoc(doc(db, 'vip_passwords', id));
    } catch (e) {
      alert('Lỗi xóa');
    }
  };

  const handleResetDevice = async (id: string) => {
    if (!window.confirm(`Reset thiết bị cho mật khẩu ${id} để họ đăng nhập máy khác?`)) return;
    try {
      await updateDoc(doc(db, 'vip_passwords', id), {
        deviceId: ''
      });
    } catch (e) {
      alert('Lỗi reset');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 p-6 rounded-2xl relative shadow-2xl overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <KeyRound className="text-emerald-400" /> Quản Lý Mật Khẩu VIP
        </h2>

        {!isAdmin ? (
          <div className="text-center py-10">
            <p className="text-slate-400 mb-6">Bạn phải đăng nhập bằng email Admin để quản lý mật khẩu.</p>
            <button 
              onClick={handleLogin}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex flex-col items-center gap-1 mx-auto"
            >
              Đăng nhập Admin
              <span className="text-[10px] font-normal text-emerald-100">minhtuyenmmokg@gmail.com</span>
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : (
          <div className="flex flex-col h-full max-h-[60vh]">
            <div className="flex gap-2 mb-6 bg-slate-950 p-2 rounded-xl border border-slate-800">
              <input 
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="flex-1 bg-transparent px-3 py-2 text-white outline-none"
              />
              <input 
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Ghi chú (tên khách...)"
                className="flex-1 bg-transparent px-3 py-2 text-white outline-none border-l border-slate-800"
              />
              <button 
                onClick={handleAdd}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2">
              {passwords.length === 0 ? (
                <div className="text-center text-slate-500 py-10">Chưa có mật khẩu nào.</div>
              ) : passwords.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="font-mono text-emerald-400 font-bold">{p.id}</div>
                    <div className="text-xs text-slate-400 mt-1">{p.note || 'Không có ghi chú'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.deviceId ? (
                      <button 
                        onClick={() => handleResetDevice(p.id)}
                        className="text-xs flex items-center gap-1 text-amber-500 hover:text-amber-400 bg-amber-500/10 px-2 py-1 rounded"
                        title="Đã khóa với thiết bị. Nhấn để reset."
                      >
                        <MonitorSmartphone className="w-3 h-3" /> Đã dùng (Reset)
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-500/70 bg-emerald-500/10 px-2 py-1 rounded">Chưa dùng</span>
                    )}
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 text-right">
              <button onClick={() => signOut(auth)} className="text-sm text-slate-500 hover:text-slate-300">Đăng xuất</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
