import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const TABS = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '最热' },
  { key: 'following', label: '关注' },
  { key: 'entrance', label: '进场' },
];

const TYPE_FILTERS = [
  { key: '', label: '全部' },
  { key: 'video', label: '视频' },
  { key: 'image_text', label: '图文' },
  { key: 'audio', label: '音频' },
  { key: 'code', label: '代码' },
];

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('latest');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [searchMode, setSearchMode] = useState(null); // null | 'tag' | 'fulltext'
  const [recentUsers, setRecentUsers] = useState([]);

  const fetchPosts = useCallback(() => {
    if (activeTab === 'entrance') return;
    setLoading(true);
    setError(null);

    // Fulltext search mode
    if (searchMode === 'fulltext' && tagSearch) {
      api.search(tagSearch, page)
        .then((data) => {
          setPosts(data.posts || []);
          setTotalPages(data.totalPages || 1);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    const sort = activeTab === 'hot' ? 'hot' : 'latest';
    const following = activeTab === 'following' ? true : false;
    const tag = searchMode === 'tag' ? tagSearch : undefined;
    api.getPlaza(page, { sort, type: typeFilter || undefined, tag, following: following || undefined })
      .then((data) => {
        setPosts(data.posts || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab, page, typeFilter, tagSearch, searchMode]);

  const fetchRecentUsers = useCallback(() => {
    if (activeTab !== 'entrance') return;
    setLoading(true);
    setError(null);
    api.getRecentUsers()
      .then((data) => setRecentUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'entrance') {
      fetchRecentUsers();
    } else {
      fetchPosts();
    }
  }, [activeTab, fetchPosts, fetchRecentUsers]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleTypeChange = (type) => {
    setTypeFilter(type);
    setPage(1);
  };

  const handleTagSearch = () => {
    const val = tagInput.trim();
    if (!val) return;
    if (val.startsWith('#')) {
      setSearchMode('tag');
      setTagSearch(val.slice(1));
    } else {
      setSearchMode('fulltext');
      setTagSearch(val);
    }
    setPage(1);
  };

  const showFilters = activeTab !== 'entrance';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">广场</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters (not shown on entrance tab) */}
      {showFilters && (
        <div className="mb-4 space-y-3">
          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((tf) => (
              <button
                key={tf.key}
                onClick={() => handleTypeChange(tf.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  typeFilter === tf.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          {/* Tag search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTagSearch()}
              placeholder="搜索内容，#标签..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleTagSearch}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              搜索
            </button>
            {tagSearch && (
              <button
                onClick={() => { setTagInput(''); setTagSearch(''); setSearchMode(null); setPage(1); }}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
              >
                清除
              </button>
            )}
          </div>
          {tagSearch && (
            <p className="text-xs text-gray-500">
              {searchMode === 'tag'
                ? <>当前搜索标签: <span className="text-indigo-600 font-medium">#{tagSearch}</span></>
                : <>搜索: <span className="text-indigo-600 font-medium">{tagSearch}</span></>
              }
            </p>
          )}
        </div>
      )}

      {/* Following tab - login prompt */}
      {activeTab === 'following' && !user && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">请先登录查看关注内容</p>
          <Link to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            去登录
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <span className="text-gray-400">加载中...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">加载失败: {error}</p>
          <button onClick={() => activeTab === 'entrance' ? fetchRecentUsers() : fetchPosts()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">重试</button>
        </div>
      )}

      {/* Entrance tab - recent users grid */}
      {activeTab === 'entrance' && !loading && !error && (
        <>
          {recentUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-12">暂无进场用户</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recentUsers.map((u) => (
                <Link
                  key={u.id}
                  to={`/user/${u.id}`}
                  className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={u.avatar || '/default-avatar.png'}
                    alt={u.nickname}
                    className="w-16 h-16 rounded-full object-cover bg-gray-200 mb-2"
                  />
                  <span className="font-medium text-sm text-gray-800 truncate w-full text-center">{u.nickname || u.username}</span>
                  {u.bio && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 text-center">{u.bio}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Posts list (latest/hot/following tabs) */}
      {activeTab !== 'entrance' && !loading && !error && !(activeTab === 'following' && !user) && (
        <>
          {posts.length === 0 ? (
            <p className="text-gray-400 text-center py-12">暂无内容</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post}
                  onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  onHide={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-gray-500 text-sm">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
