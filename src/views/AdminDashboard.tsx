import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  Search,
  UserCheck,
  Globe,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { dbService } from '../services/dbService';
import {
  UserProfile,
  UserRole,
  TeacherDirectoryEntry,
  SupportTicket,
  FeedbackItem,
  CommunityPost,
} from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teachers, setTeachers] = useState<TeacherDirectoryEntry[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'support' | 'feedback' | 'community'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [search, setSearch] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, t, tk, fb, cp] = await Promise.all([
        dbService.getAllUsers(),
        dbService.getApprovedTeachers(),
        dbService.getAllSupportTickets(),
        dbService.getAllFeedback(),
        dbService.getCommunityPosts(true),
      ]);
      setUsers(u);
      setTeachers(t);
      setTickets(tk);
      setFeedback(fb);
      setCommunityPosts(cp);
    } catch (err) {
      console.error('Admin load error:', err);
      toast.error('Could not load all admin records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleApproveTeacher = async (target: UserProfile) => {
    try {
      await dbService.adminUpdateUserRole(target, 'teacher', 'approved');
      toast.success(`Approved ${target.displayName || target.email} as a Teacher!`);
      await loadAll();
    } catch (err) {
      toast.error('Failed to approve teacher.');
    }
  };

  const handleRejectTeacher = async (target: UserProfile) => {
    try {
      await dbService.adminUpdateUserRole(target, 'teacher', 'rejected');
      toast.success(`Updated status for ${target.displayName || target.email}`);
      await loadAll();
    } catch (err) {
      toast.error('Failed to update teacher status.');
    }
  };

  const handleRoleChange = async (target: UserProfile, newRole: UserRole) => {
    try {
      const status = newRole === 'teacher' ? 'approved' : undefined;
      await dbService.adminUpdateUserRole(target, newRole, status);
      toast.success(`Updated role to ${newRole}`);
      await loadAll();
    } catch (err) {
      toast.error('Failed to change role.');
    }
  };

  const handleAssignTeacher = async (student: UserProfile, teacherId: string) => {
    const teacher = teachers.find((t) => t.teacherId === teacherId);
    if (!teacher) return;
    try {
      await dbService.adminAssignStudentToTeacher(student, teacher);
      toast.success(`Assigned ${student.displayName || student.email} to ${teacher.displayName}`);
      await loadAll();
    } catch (err) {
      toast.error('Failed to assign student.');
    }
  };

  const handleToggleTicket = async (ticket: SupportTicket) => {
    const next = ticket.status === 'open' ? 'closed' : 'open';
    try {
      await dbService.updateSupportTicketStatus(ticket.id, next);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: next } : t)));
      toast.success(`Ticket marked as ${next}`);
    } catch (err) {
      toast.error('Failed to update ticket.');
    }
  };

  const handleToggleCommunityStatus = async (post: CommunityPost) => {
    const next = post.status === 'published' ? 'hidden' : 'published';
    try {
      await dbService.adminUpdateCommunityPostStatus(post.id, next);
      setCommunityPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: next } : p)));
      toast.success(`Post ${next === 'hidden' ? 'hidden from' : 'restored to'} community feed`);
    } catch (err) {
      toast.error('Failed to update post status.');
    }
  };

  const handleDeleteCommunityPost = async (postId: string, attachmentFileId?: string) => {
    try {
      await dbService.deleteCommunityPost(postId, attachmentFileId);
      setCommunityPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Community post deleted.');
    } catch (err) {
      toast.error('Failed to delete post.');
    }
  };

  const pendingTeachers = users.filter((u) => u.role === 'teacher' && u.teacherStatus === 'pending');
  const studentCount = users.filter((u) => (u.role || 'student') === 'student').length;
  const approvedTeacherCount = users.filter((u) => u.role === 'teacher' && u.teacherStatus === 'approved').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;

  const filteredUsers = users.filter((u) => {
    const uRole = u.role || 'student';
    if (roleFilter !== 'all' && uRole !== roleFilter) return false;
    const q = search.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.grade || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <ShieldCheck size={22} />
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Control Center</h1>
          <p className="text-slate-500">
            Manage students & teachers, approve educator accounts, assign classes, and resolve support tickets.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm self-start">
          {[
            { id: 'users', label: `Users (${users.length})` },
            { id: 'community', label: `Community (${communityPosts.length})` },
            { id: 'support', label: `Support (${openTicketsCount})` },
            { id: 'feedback', label: `Feedback (${feedback.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <GraduationCap size={22} />
            <span className="text-xs font-bold uppercase text-slate-400">Students</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{studentCount}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <UserCheck size={22} />
            <span className="text-xs font-bold uppercase text-slate-400">Approved Teachers</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{approvedTeacherCount}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <Clock size={22} />
            <span className="text-xs font-bold uppercase text-slate-400">Pending Approvals</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingTeachers.length}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <MessageSquare size={22} />
            <span className="text-xs font-bold uppercase text-slate-400">Open Tickets</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{openTicketsCount}</div>
        </div>
      </div>

      {/* Pending Teacher Approvals Queue */}
      {pendingTeachers.length > 0 && activeTab === 'users' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-[2rem] p-6 space-y-4">
          <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <Clock size={20} />
            Pending Teacher Approvals ({pendingTeachers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTeachers.map((t) => (
              <div key={t.userId} className="bg-white p-5 rounded-2xl border border-amber-100 flex flex-col justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{t.displayName || t.email}</p>
                  <p className="text-xs text-slate-500">{t.email}</p>
                  <p className="text-xs text-indigo-600 font-semibold mt-2">
                    Subjects: {t.subjects?.join(', ') || 'General'}
                  </p>
                  {t.bio && <p className="text-xs text-slate-600 mt-2">{t.bio}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveTeacher(t)}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={15} />
                    Approve & Generate Code
                  </button>
                  <button
                    onClick={() => handleRejectTeacher(t)}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-100"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search users by name, email, or grade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-indigo-300"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                    roleFilter === r
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Progress / Info</th>
                  <th className="py-3 px-4">Assigned Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredUsers.map((u) => {
                  const uRole = u.role || 'student';
                  return (
                    <tr key={u.userId} className="hover:bg-slate-50/60">
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900">{u.displayName || u.email.split('@')[0]}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={uRole}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                        {uRole === 'teacher' && u.teacherStatus && (
                          <span className={cn(
                            "ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                            u.teacherStatus === 'approved' ? "bg-emerald-50 text-emerald-700" :
                            u.teacherStatus === 'pending' ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-600"
                          )}>
                            {u.teacherStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600">
                        {uRole === 'teacher' ? (
                          <span>Code: <strong>{u.classCode || 'None'}</strong></span>
                        ) : (
                          <span>{u.grade} • {u.totalLessons || 0} lessons • 🔥 {u.streak || 0}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {uRole === 'student' ? (
                          <select
                            value={u.teacherId || ''}
                            onChange={(e) => {
                              if (e.target.value) handleAssignTeacher(u, e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((t) => (
                              <option key={t.teacherId} value={t.teacherId}>
                                {t.displayName} ({t.classCode})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Support Tickets Tab */}
      {activeTab === 'support' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Support Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No support tickets submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((tk) => (
                <div key={tk.id} className="p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase",
                        tk.status === 'open' ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {tk.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{tk.userEmail || tk.userId}</span>
                      <span className="text-xs text-slate-400">• {new Date(tk.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-800">{tk.message}</p>
                  </div>
                  <button
                    onClick={() => handleToggleTicket(tk)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold shrink-0",
                      tk.status === 'open'
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {tk.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">User Feedback</h2>
          {feedback.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No feedback submitted yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedback.map((fb) => (
                <div key={fb.id} className="p-5 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: fb.rating }).map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{new Date(fb.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{fb.feedback}</p>
                  <p className="text-xs text-slate-400">{fb.userEmail || fb.userId}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Community Moderation Tab */}
      {activeTab === 'community' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe size={20} className="text-indigo-600" />
            Community Moderation ({communityPosts.length})
          </h2>
          {communityPosts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No community posts have been shared yet.</p>
          ) : (
            <div className="space-y-3">
              {communityPosts.map((post) => (
                <div key={post.id} className="p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase",
                        post.status === 'published' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        {post.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                        {post.postType}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{post.subject}</span>
                      <span className="text-xs text-slate-400">
                        by {post.authorName} ({post.authorRole}) • {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate">{post.title}</p>
                    {post.attachmentName && (
                      <p className="text-xs text-indigo-600 font-semibold">PDF: {post.attachmentName}</p>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCommunityStatus(post)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5",
                        post.status === 'published'
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      )}
                    >
                      {post.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                      {post.status === 'published' ? 'Hide' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDeleteCommunityPost(post.id, post.attachmentFileId)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
