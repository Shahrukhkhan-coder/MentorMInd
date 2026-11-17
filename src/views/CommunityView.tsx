import React, { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  ExternalLink,
  Trash2,
  Sparkles,
  BookOpen,
  Link2,
  HelpCircle,
  Send,
  X,
  FileText,
  Upload,
  Download,
  Eye,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../lib/AuthContext';
import { dbService } from '../services/dbService';
import { aiService } from '../services/aiService';
import {
  CommunityPost,
  CommunityPostType,
  CommunityComment,
  SUBJECTS,
  UserGrade,
  UserRole,
} from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const GRADES: UserGrade[] = ['Elementary', 'Middle School', 'High School', 'College', 'University'];
const MAX_PDF_BYTES = 3670016; // ~3.5 MB

const POST_TYPE_META: Record<
  CommunityPostType,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  note: { label: 'Study Note', badgeClass: 'bg-indigo-50 text-indigo-700', icon: BookOpen },
  resource: { label: 'Resource Link', badgeClass: 'bg-emerald-50 text-emerald-700', icon: Link2 },
  question: { label: 'Q&A Discussion', badgeClass: 'bg-amber-50 text-amber-700', icon: HelpCircle },
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  teacher: 'bg-purple-50 text-purple-700',
  admin: 'bg-amber-50 text-amber-700',
  student: 'bg-slate-100 text-slate-700',
};

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CommunityView() {
  const { user, profile, effectiveRole, isAdmin, activePortal, refreshProfile } = useAuth();
  const isActingAsAdmin = isAdmin && activePortal === 'admin';
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CommunityPostType | 'saved'>('all');

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [postType, setPostType] = useState<CommunityPostType>('note');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(profile?.subjects?.[0] || SUBJECTS[0]);
  const [grade, setGrade] = useState<UserGrade>(profile?.grade || 'High School');
  const [content, setContent] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PDF Preview / Download state
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; fileName: string } | null>(null);

  // Comments state keyed by postId
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await dbService.getCommunityPosts(false);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load community posts:', err);
      toast.error('Could not load community feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdf?.url) {
        URL.revokeObjectURL(previewPdf.url);
      }
    };
  }, [previewPdf]);

  const handleSelectPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Please select a valid PDF file (.pdf).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error('PDF file size must be 3.5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setSelectedPdf(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const clearSelectedPdf = () => {
    setSelectedPdf(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePolishWithAI = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error('Enter a title or rough notes first so AI can help structure them.');
      return;
    }
    setPolishing(true);
    try {
      const prompt = content.trim()
        ? `Organize and polish these student/teacher study notes clearly in Markdown with bulleted key takeaways and an example:\n\nTitle: ${title || subject}\n\nNotes:\n${content}`
        : `Write clear, helpful study notes in Markdown (with key takeaways and 1 worked example) about "${title}" for ${grade} ${subject}.`;
      const result = await aiService.chatAboutConcept(
        title || subject,
        subject,
        prompt,
        [],
        grade,
        profile?.goals
      );
      if (result) {
        setContent(result);
        toast.success('Notes formatted with AI!');
      }
    } catch (err) {
      toast.error('AI polish unavailable right now. You can still post directly!');
    } finally {
      setPolishing(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const finalContent =
      content.trim() ||
      (selectedPdf ? `Shared PDF study material: **${selectedPdf.name}**` : '');

    if (!title.trim() || !finalContent) {
      toast.error('Please enter a title and either notes/content or a PDF attachment.');
      return;
    }

    const trimmedUrl = resourceUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      toast.error('Resource URL must start with http:// or https://');
      return;
    }

    setSubmitting(true);
    try {
      let attachmentMeta:
        | { attachmentFileId: string; attachmentName: string; attachmentSize: number }
        | undefined;

      if (selectedPdf) {
        attachmentMeta = await dbService.uploadCommunityPdf(user.uid, selectedPdf);
      }

      const created = await dbService.createCommunityPost({
        authorId: user.uid,
        authorName: profile.displayName || user.displayName || profile.email.split('@')[0],
        authorRole: isAdmin ? activePortal : effectiveRole,
        postType,
        title,
        subject,
        grade,
        content: finalContent,
        resourceUrl: trimmedUrl || undefined,
        ...(attachmentMeta || {}),
      });

      setPosts((prev) => [created, ...prev]);
      setTitle('');
      setContent('');
      setResourceUrl('');
      clearSelectedPdf();
      setShowComposer(false);
      toast.success('Shared to the MentorMind Community!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewPdf = async (post: CommunityPost) => {
    if (!post.attachmentFileId) return;
    setLoadingFileId(post.attachmentFileId);
    try {
      const result = await dbService.downloadCommunityPdfBlobUrl(post.attachmentFileId);
      setPreviewPdf(result);
    } catch (err) {
      toast.error('Could not load PDF preview.');
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleDownloadPdf = async (post: CommunityPost) => {
    if (!post.attachmentFileId) return;
    setLoadingFileId(post.attachmentFileId);
    try {
      const { url, fileName } = await dbService.downloadCommunityPdfBlobUrl(post.attachmentFileId);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      toast.error('Could not download PDF.');
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleToggleUpvote = async (post: CommunityPost) => {
    if (!user) return;
    try {
      const next = await dbService.toggleCommunityUpvote(post.id, user.uid, post.upvoterIds || []);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, upvoterIds: next } : p)));
    } catch (err) {
      toast.error('Could not update upvote.');
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!user || !profile) return;
    const saved = profile.savedPostIds || [];
    try {
      const nextSaved = await dbService.toggleSaveCommunityPost(user.uid, postId, saved);
      await refreshProfile();
      toast.success(nextSaved.includes(postId) ? 'Saved to your bookmarks' : 'Removed from bookmarks');
    } catch (err) {
      toast.error('Could not update bookmark.');
    }
  };

  const handleDeletePost = async (post: CommunityPost) => {
    if (!user || (user.uid !== post.authorId && !isActingAsAdmin)) {
      toast.error('Only the post author or an admin can delete this post.');
      return;
    }
    try {
      await dbService.deleteCommunityPost(post.id, post.attachmentFileId);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success('Post removed.');
    } catch (err) {
      toast.error('Failed to delete post.');
    }
  };

  const handleToggleComments = async (postId: string) => {
    const nextOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: nextOpen }));
    if (nextOpen && !commentsByPost[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const list = await dbService.getCommunityComments(postId);
        setCommentsByPost((prev) => ({ ...prev, [postId]: list }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (post: CommunityPost) => {
    if (!user || !profile) return;
    const text = (commentInputs[post.id] || '').trim();
    if (!text) return;

    setPostingComment((prev) => ({ ...prev, [post.id]: true }));
    try {
      const created = await dbService.addCommunityComment(
        post.id,
        {
          authorId: user.uid,
          authorName: profile.displayName || user.displayName || profile.email.split('@')[0],
          authorRole: isAdmin ? activePortal : effectiveRole,
          content: text,
        },
        post.commentsCount || 0
      );
      setCommentsByPost((prev) => ({
        ...prev,
        [post.id]: [...(prev[post.id] || []), created],
      }));
      setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
      );
    } catch (err) {
      toast.error('Failed to add comment.');
    } finally {
      setPostingComment((prev) => ({ ...prev, [post.id]: false }));
    }
  };

  const handleDeleteComment = async (post: CommunityPost, comment: CommunityComment) => {
    if (!user || (user.uid !== comment.authorId && !isActingAsAdmin)) {
      toast.error('Only the comment author or an admin can delete this comment.');
      return;
    }
    try {
      await dbService.deleteCommunityComment(post.id, comment.id, post.commentsCount || 0);
      setCommentsByPost((prev) => ({
        ...prev,
        [post.id]: (prev[post.id] || []).filter((c) => c.id !== comment.id),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p
        )
      );
    } catch (err) {
      toast.error('Failed to remove comment.');
    }
  };

  const savedIds = profile?.savedPostIds || [];
  const filteredPosts = posts.filter((p) => {
    if (subjectFilter !== 'all' && p.subject !== subjectFilter) return false;
    if (typeFilter === 'saved' && !savedIds.includes(p.id)) return false;
    if (typeFilter !== 'all' && typeFilter !== 'saved' && p.postType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        (p.attachmentName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Globe size={22} />
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider">
              Community Hub
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Knowledge & Resource Community
          </h1>
          <p className="text-slate-500">
            Share study notes, PDF materials, curated learning links, and Q&A across students and teachers.
          </p>
        </div>

        <button
          onClick={() => setShowComposer((prev) => !prev)}
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 self-start"
        >
          {showComposer ? <X size={18} /> : <Plus size={18} />}
          {showComposer ? 'Close Composer' : 'Share Knowledge'}
        </button>
      </div>

      {/* Share Knowledge Composer */}
      {showComposer && (
        <form
          onSubmit={handleCreatePost}
          className="bg-white rounded-[2rem] border border-indigo-100 shadow-sm p-8 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Create a Community Post</h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
              {(['note', 'resource', 'question'] as CommunityPostType[]).map((t) => {
                const meta = POST_TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                      postType === t
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
              <input
                type="text"
                placeholder={
                  postType === 'question'
                    ? 'e.g. How do you solve integration by parts?'
                    : 'e.g. Cheat Sheet: Newton Laws of Motion'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Level</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as UserGrade)}
                className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Resource Link {postType === 'resource' ? '(Optional if PDF attached)' : '(Optional)'}
              </label>
              <input
                type="url"
                placeholder="https://khanacademy.org/..."
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                maxLength={500}
                className="mt-1.5 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Attach PDF Study File (Optional • Max 3.5 MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleSelectPdf}
                className="hidden"
              />
              {selectedPdf ? (
                <div className="mt-1.5 p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={18} className="text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedPdf.name}</p>
                      <p className="text-[11px] text-indigo-700">{formatFileSize(selectedPdf.size)} • PDF</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedPdf}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    title="Remove PDF"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 w-full p-3.5 bg-slate-50 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-2xl text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-2 transition-all"
                >
                  <Upload size={16} />
                  Upload PDF Notes, Worksheet, or Guide
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Notes / Explanation / Question (Markdown Supported)
              </label>
              <button
                type="button"
                onClick={handlePolishWithAI}
                disabled={polishing}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles size={14} />
                {polishing ? 'Formatting with AI...' : 'Polish / Draft with AI'}
              </button>
            </div>
            <textarea
              placeholder="Share clear explanations, summaries, helpful links, or describe your attached PDF..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={20000}
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="px-5 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={16} />
              {submitting
                ? selectedPdf
                  ? 'Uploading PDF & Publishing...'
                  : 'Publishing...'
                : 'Publish to Community'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Posts' },
            { id: 'note', label: 'Study Notes' },
            { id: 'resource', label: 'Resources' },
            { id: 'question', label: 'Q&A' },
            { id: 'saved', label: `Saved (${savedIds.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                typeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
          >
            <option value="all">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="relative min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search notes, PDFs, authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-indigo-300"
            />
          </div>
        </div>
      </div>

      {/* Feed */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-14 text-center space-y-3">
          <Globe size={40} className="mx-auto text-slate-300" />
          <h3 className="text-lg font-bold text-slate-800">No community posts match your filter yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Be the first to share a study note, PDF guide, helpful learning link, or question with fellow learners and teachers!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const typeMeta = POST_TYPE_META[post.postType] || POST_TYPE_META.note;
            const TypeIcon = typeMeta.icon;
            const hasUpvoted = user ? (post.upvoterIds || []).includes(user.uid) : false;
            const isSaved = savedIds.includes(post.id);
            const isAuthor = Boolean(user?.uid && user.uid === post.authorId);
            const canDelete = isAuthor || isActingAsAdmin;
            const isCommentsOpen = !!expandedComments[post.id];
            const postComments = commentsByPost[post.id] || [];
            const isFileLoading = loadingFileId === post.attachmentFileId;

            return (
              <article
                key={post.id}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-7 space-y-5"
              >
                {/* Post Meta */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center">
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{post.authorName}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider',
                            ROLE_BADGE_CLASS[post.authorRole] || ROLE_BADGE_CLASS.student
                          )}
                        >
                          {post.authorRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()} • {post.grade}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                      {post.subject}
                    </span>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1',
                        typeMeta.badgeClass
                      )}
                    >
                      <TypeIcon size={13} />
                      {typeMeta.label}
                    </span>
                  </div>
                </div>

                {/* Title & Content */}
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900">{post.title}</h3>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{post.content}</ReactMarkdown>
                  </div>
                </div>

                {/* PDF Attachment Card */}
                {post.attachmentFileId && post.attachmentName && (
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{post.attachmentName}</p>
                        <p className="text-xs text-indigo-700 font-medium">
                          PDF Attachment {post.attachmentSize ? `• ${formatFileSize(post.attachmentSize)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewPdf(post)}
                        disabled={isFileLoading}
                        className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        {isFileLoading ? 'Loading...' : 'Preview PDF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(post)}
                        disabled={isFileLoading}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                )}

                {/* External Resource Link */}
                {post.resourceUrl && (
                  <a
                    href={post.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open Shared Resource
                    <span className="text-emerald-600/80 font-normal truncate max-w-[260px]">
                      ({post.resourceUrl})
                    </span>
                  </a>
                )}

                {/* Action Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleUpvote(post)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                        hasUpvoted
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                      )}
                    >
                      <ThumbsUp size={14} />
                      Helpful ({post.upvoterIds?.length || 0})
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                        isCommentsOpen
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <MessageSquare size={14} />
                      Discussion ({post.commentsCount || 0})
                    </button>

                    <button
                      onClick={() => handleToggleBookmark(post.id)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                        isSaved
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      {isAuthor ? 'Delete' : 'Admin Delete'}
                    </button>
                  )}
                </div>

                {/* Expandable Comments Thread */}
                {isCommentsOpen && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    {loadingComments[post.id] ? (
                      <p className="text-xs text-slate-400">Loading discussion...</p>
                    ) : postComments.length === 0 ? (
                      <p className="text-xs text-slate-400">No replies yet. Start the discussion!</p>
                    ) : (
                      <div className="space-y-3">
                        {postComments.map((c) => {
                          const canDeleteComment = Boolean(
                            user?.uid && (user.uid === c.authorId || isActingAsAdmin)
                          );
                          return (
                            <div
                              key={c.id}
                              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{c.authorName}</span>
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-md text-[10px] font-black uppercase',
                                      ROLE_BADGE_CLASS[c.authorRole] || ROLE_BADGE_CLASS.student
                                    )}
                                  >
                                    {c.authorRole}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                              </div>
                              {canDeleteComment && (
                                <button
                                  onClick={() => handleDeleteComment(post, c)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="Delete comment"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a helpful reply or follow-up question..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post);
                          }
                        }}
                        maxLength={3000}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post)}
                        disabled={postingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Send size={14} />
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* In-App PDF Preview Modal */}
      {previewPdf && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={20} className="text-indigo-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm truncate">{previewPdf.fileName}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewPdf.url}
                  download={previewPdf.fileName}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-100">
              <iframe
                src={previewPdf.url}
                title={previewPdf.fileName}
                className="w-full h-[72vh] rounded-2xl bg-white border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
