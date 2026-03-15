import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import MentionInput from '../components/MentionInput';
import MarkdownToolbar from '../components/MarkdownToolbar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import VideoPlayer from '../components/VideoPlayer';
import AudioPlayer from '../components/AudioPlayer';
import RepoCard from '../components/RepoCard';

const POST_TYPES = [
  { key: 'video', label: '视频' },
  { key: 'image_text', label: '图文' },
  { key: 'audio', label: '音频' },
  { key: 'code', label: '代码' },
];

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState('image_text');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [linkPreview, setLinkPreview] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState({ plaza: true, private: false, memo: false });
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [mediaMeta, setMediaMeta] = useState(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (visibility.private) {
      api.getCircles()
        .then((data) => setCircles(data.circles || data || []))
        .catch(() => {});
    }
  }, [visibility.private]);

  const handleLinkPreview = async () => {
    if (!link.trim()) return;
    setLinkLoading(true);
    try {
      const data = await api.linkPreview(link);
      setLinkPreview(data);
    } catch (err) {
      alert('抓取失败: ' + err.message);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleFetchRepo = async () => {
    if (!link.trim()) return;
    setRepoLoading(true);
    try {
      const data = await api.repoInfo(link);
      setMediaMeta(data);
    } catch (err) {
      alert(err.message || '仅支持 GitHub 和 Gitee 仓库地址');
    } finally {
      setRepoLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 9) {
      alert('最多上传9张图片');
      return;
    }
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const val = tagInput.trim().replace(/,/g, '');
    if (!val) return;
    if (tags.length >= 10) {
      alert('最多添加10个标签');
      return;
    }
    if (!tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    setTagInput('');
  };

  const removeTag = (index) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      setError('请输入内容或上传图片');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('content', content);
      if (link.trim()) fd.append('link', link);
      if (tags.length > 0) fd.append('tags', JSON.stringify(tags));
      if (mediaMeta) fd.append('media_meta', JSON.stringify(mediaMeta));

      const visArr = [];
      if (visibility.plaza) visArr.push('plaza');
      if (visibility.private) visArr.push('private');
      if (visibility.memo) visArr.push('memo');
      fd.append('visibility', JSON.stringify(visArr));

      if (visibility.private && selectedCircle) {
        fd.append('circle_id', selectedCircle);
      }

      images.forEach((file) => {
        fd.append('images', file);
      });

      await api.createPost(fd);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="text-gray-400">请先登录</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">发布内容</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
          <div className="flex gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  type === t.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1 text-xs rounded transition-colors ${!previewMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1 text-xs rounded transition-colors ${previewMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              预览
            </button>
          </div>
          {previewMode ? (
            <div className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[150px] bg-white">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-gray-400 text-sm">暂无内容</p>
              )}
            </div>
          ) : (
            <div>
              <MarkdownToolbar textareaRef={contentRef} value={content} onChange={setContent} />
              <MentionInput
                ref={contentRef}
                value={content}
                onChange={setContent}
                rows={6}
                placeholder="写点什么...  支持 Markdown 语法，输入 @ 可以提及用户"
                className="!rounded-t-none !border-t-0"
              />
            </div>
          )}
        </div>

        {/* Link / Media URL area — varies by type */}
        <div>
          {type === 'image_text' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">链接</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={handleLinkPreview}
                  disabled={linkLoading || !link.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {linkLoading ? '抓取中...' : '抓取预览'}
                </button>
              </div>
              {linkPreview && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-sm">
                  {linkPreview.title && <p className="font-medium">{linkPreview.title}</p>}
                  {linkPreview.description && (
                    <p className="text-gray-500 mt-1">{linkPreview.description}</p>
                  )}
                  {linkPreview.image && (
                    <img src={linkPreview.image} alt="" className="mt-2 max-h-32 rounded" />
                  )}
                </div>
              )}
            </>
          )}

          {type === 'video' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">视频地址</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="粘贴视频地址..."
              />
              {link.trim() && (
                <div className="mt-2">
                  <VideoPlayer url={link} />
                </div>
              )}
            </>
          )}

          {type === 'audio' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">音频地址</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="粘贴音频地址..."
              />
              {link.trim() && (
                <div className="mt-2">
                  <AudioPlayer url={link} title="音频预览" />
                </div>
              )}
            </>
          )}

          {type === 'code' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">仓库地址</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="粘贴 GitHub/Gitee 仓库地址..."
                />
                <button
                  type="button"
                  onClick={handleFetchRepo}
                  disabled={repoLoading || !link.trim()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {repoLoading ? '抓取中...' : '抓取仓库'}
                </button>
              </div>
              {mediaMeta && (
                <div className="mt-2">
                  <RepoCard repoInfo={mediaMeta} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            图片 ({images.length}/9)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((file, i) => (
              <div key={i} className="relative w-20 h-20">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="w-full h-full object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  x
                </button>
              </div>
            ))}
            {images.length < 9 && (
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400">
                <span className="text-2xl text-gray-400">+</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签 ({tags.length}/10)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入标签，按回车或逗号添加"
            disabled={tags.length >= 10}
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">可见范围</label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.plaza}
                onChange={(e) =>
                  setVisibility((v) => ({ ...v, plaza: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">广场</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.private}
                onChange={(e) =>
                  setVisibility((v) => ({ ...v, private: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">私密圈</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibility.memo}
                onChange={(e) =>
                  setVisibility((v) => ({ ...v, memo: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">备忘</span>
            </label>
          </div>

          {/* Circle Selector */}
          {visibility.private && (
            <div className="mt-3">
              <select
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择私密圈</option>
                {circles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? '发布中...' : '发布'}
        </button>
      </form>
    </div>
  );
}
