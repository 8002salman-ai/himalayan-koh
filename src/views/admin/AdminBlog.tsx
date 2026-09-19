import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { adminApi, AdminBlogFilters, BlogPostFormData } from '../../lib/supabase/api/admin';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { getErrorMessage } from '../../lib/errors';
import type { BlogPost } from '../../lib/supabase/database.types';
import { resolveLegacyImageSrc } from '../../lib/images/legacyAssets';
import {
  ADMIN_TD,
  AdminButton,
  AdminChip,
  AdminInput,
  AdminModal,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
  AdminTable,
  AdminTableSkeleton,
  type AdminColumn,
} from '../../components/admin/AdminUI';
import { BUTTON, ICON_TILE, ICON_TILE_TONES, INPUT, MICRO_LABEL, SELECT, TEXTAREA } from '../../components/admin/adminTheme';

const emptyForm: BlogPostFormData = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category: '',
  tags: [],
  is_published: false,
  published_at: '',
  meta_title: '',
  meta_description: '',
  read_time: 5,
};

const COLUMNS: AdminColumn[] = [
  { key: 'post', label: 'Post', width: '40%' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'views', label: 'Views', align: 'right' },
  { key: 'actions', label: 'Actions', align: 'right', width: '120px' },
];

/** Blog posts — list, editor and delete confirmation on the console's system. */
export default function AdminBlog() {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [formData, setFormData] = useState<BlogPostFormData>(emptyForm);
  const [tagInput, setTagInput] = useState('');

  const connected = isSupabaseConfigured();

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setPosts([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setFetchError(null);
      const filters: AdminBlogFilters = {
        search: search || undefined,
        is_published: statusFilter === 'published' ? true : statusFilter === 'draft' ? false : undefined,
        page,
        limit: 10,
      };
      const result = await adminApi.getBlogPosts(filters);
      setPosts(result.posts);
      setTotalCount(result.count);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      setFetchError(getErrorMessage(err, 'Failed to load blog posts.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditingPost(null);
    setFormData(emptyForm);
    setTagInput('');
    setEditorOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image: post.featured_image || '',
      author_id: post.author_id || undefined,
      category: post.category || '',
      tags: post.tags || [],
      is_published: post.is_published,
      published_at: post.published_at || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      read_time: post.read_time,
    });
    setTagInput((post.tags || []).join(', '));
    setEditorOpen(true);
  };

  const updateTitle = (title: string) => {
    setFormData((current) => ({
      ...current,
      title,
      slug: current.slug || slugify(title),
      meta_title: current.meta_title || title.slice(0, 60),
    }));
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setUploadError(null);
    try {
      const url = await adminApi.uploadBlogImage(file, editingPost?.id);
      setFormData((current) => ({ ...current, featured_image: url }));
    } catch (err) {
      setUploadError(getErrorMessage(err, 'Failed to upload image.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload: BlogPostFormData = {
        ...formData,
        author_id: formData.author_id || user?.id,
        tags: tagInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      };

      if (editingPost) {
        const updated = await adminApi.updateBlogPost(editingPost.id, payload);
        setPosts((current) => current.map((post) => post.id === updated.id ? updated : post));
      } else {
        const created = await adminApi.createBlogPost(payload);
        setPosts((current) => [created, ...current]);
      }

      setEditorOpen(false);
      setEditingPost(null);
      await fetchPosts();
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save blog post.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await adminApi.deleteBlogPost(id);
      setPosts((current) => current.filter((post) => post.id !== id));
      setDeleteConfirm(null);
      await fetchPosts();
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to delete blog post.'));
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (post: BlogPost) => {
    try {
      const updated = await adminApi.updateBlogPost(post.id, {
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : post.published_at || undefined,
      });
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to update blog post status.'));
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Blog posts"
        description="Create and manage the articles the storefront publishes."
        actions={
          <AdminButton variant="primary" icon={Plus} onClick={openCreate}>
            Create post
          </AdminButton>
        }
      />

      {!connected && (
        <AdminNotice tone="warning" title="Blog storage is not connected">
          Articles live in Supabase and this deployment has no configuration for it, so the list is empty
          and saving is unavailable.
        </AdminNotice>
      )}

      {fetchError && (
        <AdminNotice
          tone="danger"
          title="Blog posts could not be loaded"
          action={<AdminButton onClick={fetchPosts}>Retry</AdminButton>}
        >
          {fetchError}
        </AdminNotice>
      )}

      {saveError && (
        <AdminNotice
          tone="danger"
          title="That change was not saved"
          action={<AdminButton icon={X} onClick={() => setSaveError(null)}>Dismiss</AdminButton>}
        >
          {saveError}
        </AdminNotice>
      )}

      <AdminPanel bodyClassName="px-0 py-0">
        <div className="flex items-center gap-3 border-b border-admin-line px-5 py-4">
          <div className="relative min-w-[280px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search blog posts…"
              aria-label="Search blog posts"
              className={`${INPUT} w-full pl-10`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className={SELECT}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <span className={`ml-auto ${MICRO_LABEL}`}>
            {loading ? 'Reading…' : `${totalCount} post${totalCount === 1 ? '' : 's'}`}
          </span>
        </div>

        <AdminTable columns={COLUMNS}>
          {loading ? (
            <AdminTableSkeleton rows={5} columns={COLUMNS.length} />
          ) : posts.length === 0 ? (
            <tr>
              <td className={ADMIN_TD} colSpan={COLUMNS.length}>
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <span className={`${ICON_TILE} ${ICON_TILE_TONES.slate} h-11 w-11`}>
                    <Edit size={20} />
                  </span>
                  <p className="text-sm font-semibold text-admin-ink">No blog posts yet</p>
                  <p className="text-sm text-admin-muted">
                    {connected
                      ? 'Create the first article to get started.'
                      : 'Connect the content source to manage articles.'}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id}>
                <td className={ADMIN_TD}>
                  <div className="flex items-center gap-3">
                    <img
                      /*
                       * Editorial records still point at two legacy files this
                       * repository does not have (`cattle-grazing.jpg` and
                       * `horse-salt-lick-paddock.jpg`), so the row is rendered with
                       * the closest registered asset instead of a broken image, and
                       * the substitution is stated below the title. Inventing a new
                       * photograph for the post, or editing the record from here,
                       * would be worse than showing the reader something real.
                       */
                      src={
                        resolveLegacyImageSrc(post.featured_image).src ||
                        '/images/placeholder-product.svg'
                      }
                      alt=""
                      className="h-12 w-12 rounded-lg bg-admin-canvas object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-admin-ink">{post.title}</p>
                      <p className="truncate text-[11px] text-admin-muted">/{post.slug}</p>
                      {resolveLegacyImageSrc(post.featured_image).substitutedFrom && (
                        <p className="truncate text-[11px] font-semibold text-amber-600">
                          Featured image missing: {resolveLegacyImageSrc(post.featured_image).substitutedFrom}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`${ADMIN_TD} text-admin-muted`}>{post.category || 'Uncategorized'}</td>
                <td className={ADMIN_TD}>
                  <button
                    type="button"
                    onClick={() => handleTogglePublished(post)}
                    title={post.is_published ? 'Click to unpublish' : 'Click to publish'}
                  >
                    <AdminChip tone={post.is_published ? 'success' : 'muted'} icon={post.is_published ? Eye : EyeOff}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </AdminChip>
                  </button>
                </td>
                <td className={`${ADMIN_TD} text-right`}>{post.view_count}</td>
                <td className={`${ADMIN_TD} text-right`}>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="rounded-lg p-2 text-admin-muted transition-colors hover:bg-admin-canvas hover:text-admin-ink"
                      aria-label={`Edit ${post.title}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(post.id)}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      aria-label={`Delete ${post.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </AdminTable>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-admin-line px-5 py-3">
            <p className="text-sm text-admin-muted">
              Showing {posts.length} of {totalCount} posts
            </p>
            <div className="flex items-center gap-2">
              <AdminButton
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={15} />
                Previous
              </AdminButton>
              <span className="text-sm text-admin-muted">Page {page} of {totalPages}</span>
              <AdminButton
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight size={15} />
              </AdminButton>
            </div>
          </div>
        )}
      </AdminPanel>

      <AnimatePresence>
        {editorOpen && (
          <AdminModal
            size="wide"
            title={editingPost ? 'Edit post' : 'Create post'}
            description="Content, featured image and SEO metadata."
            onClose={() => setEditorOpen(false)}
            bodyClassName="px-0 py-0"
          >
              <form onSubmit={handleSave} className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-4">
                    <AdminInput
                      required
                      value={formData.title}
                      onChange={(event) => updateTitle(event.target.value)}
                      placeholder="Post title"
                      aria-label="Post title"
                    />
                    <AdminInput
                      required
                      value={formData.slug}
                      onChange={(event) => setFormData({ ...formData, slug: slugify(event.target.value) })}
                      placeholder="post-slug"
                      aria-label="Post slug"
                    />
                    <textarea
                      value={formData.excerpt}
                      onChange={(event) => setFormData({ ...formData, excerpt: event.target.value })}
                      placeholder="Excerpt"
                      aria-label="Excerpt"
                      className={`${TEXTAREA} min-h-24`}
                    />
                    <textarea
                      value={formData.content}
                      onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                      placeholder="Article content. HTML is supported."
                      aria-label="Article content"
                      className={`${TEXTAREA} min-h-72`}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className={MICRO_LABEL}>Featured image</p>
                      {formData.featured_image && (
                        <img
                          src={formData.featured_image}
                          alt=""
                          className="mt-2 mb-3 aspect-video w-full rounded-xl bg-admin-canvas object-cover"
                        />
                      )}
                      <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-line px-4 py-3 transition-colors hover:border-himalayan">
                        {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span className="text-sm font-medium text-admin-ink">Upload image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0])}
                        />
                      </label>
                      {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
                    </div>

                    <AdminInput
                      value={formData.category}
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                      placeholder="Category"
                      aria-label="Category"
                    />
                    <AdminInput
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      placeholder="Tags, comma separated"
                      aria-label="Tags"
                    />
                    <AdminInput
                      type="number"
                      min={1}
                      value={formData.read_time}
                      onChange={(event) => setFormData({ ...formData, read_time: Number(event.target.value) })}
                      placeholder="Read time"
                      aria-label="Read time"
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-ink">
                      <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(event) => setFormData({ ...formData, is_published: event.target.checked })}
                        className="h-4 w-4 rounded border-admin-line-strong text-himalayan focus:ring-himalayan"
                      />
                      Published
                    </label>

                    <div className="space-y-3 border-t border-admin-line pt-4">
                      <h3 className={MICRO_LABEL}>SEO metadata</h3>
                      <AdminInput
                        value={formData.meta_title}
                        onChange={(event) => setFormData({ ...formData, meta_title: event.target.value })}
                        placeholder="SEO title"
                        maxLength={60}
                        aria-label="SEO title"
                      />
                      <textarea
                        value={formData.meta_description}
                        onChange={(event) => setFormData({ ...formData, meta_description: event.target.value })}
                        placeholder="SEO description"
                        maxLength={160}
                        aria-label="SEO description"
                        className={`${TEXTAREA} min-h-24`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-admin-line pt-5">
                  {saveError && (
                    <AdminNotice tone="danger" title="Save failed">
                      {saveError}
                    </AdminNotice>
                  )}
                  <div className="flex justify-end gap-2">
                    <AdminButton onClick={() => setEditorOpen(false)}>Cancel</AdminButton>
                    <button type="submit" disabled={saving} className={BUTTON.primary}>
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Save post
                    </button>
                  </div>
                </div>
              </form>
          </AdminModal>
        )}

        {deleteConfirm && (
          <AdminModal
            size="sm"
            title="Delete this post?"
            description="This cannot be undone."
            onClose={() => setDeleteConfirm(null)}
            footer={
              <>
                <AdminButton onClick={() => setDeleteConfirm(null)}>Cancel</AdminButton>
                <AdminButton variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={saving}>
                  Delete
                </AdminButton>
              </>
            }
          >
            <p className="text-sm text-admin-ink">
              The post and its SEO metadata are removed. Drafts are not recoverable.
            </p>
          </AdminModal>
        )}
      </AnimatePresence>
    </>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
