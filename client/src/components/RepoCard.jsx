export default function RepoCard({ repoInfo }) {
  if (!repoInfo || !repoInfo.repo) {
    return (
      <div className="w-full bg-gray-50 rounded-lg border p-4 text-gray-400 text-sm text-center">
        没有检测到代码仓库
      </div>
    );
  }

  const { platform, owner, repo, description, avatar, stars, forks, watchers, lastCommit, url } = repoInfo;

  const platformIcon = platform === 'github' ? (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.984 0A12 12 0 000 12a12 12 0 008.315 11.422c.608.112.832-.261.832-.584v-2.046c-3.384.737-4.1-1.632-4.1-1.632a3.22 3.22 0 00-1.356-1.783c-1.1-.752.084-.737.084-.737a2.558 2.558 0 011.868 1.26 2.6 2.6 0 003.546 1.013 2.593 2.593 0 01.776-1.632c-2.7-.307-5.54-1.35-5.54-6.012a4.7 4.7 0 011.252-3.264 4.37 4.37 0 01.12-3.222s1.02-.327 3.342 1.246a11.52 11.52 0 016.072 0c2.316-1.58 3.336-1.246 3.336-1.246a4.37 4.37 0 01.12 3.222 4.69 4.69 0 011.252 3.264c0 4.672-2.844 5.702-5.556 6.002a2.908 2.908 0 01.828 2.258v3.348c0 .327.216.704.84.584A12 12 0 0024 12 12.009 12.009 0 0011.984 0z" />
    </svg>
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-gray-50 rounded-lg border p-4 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        {avatar && <img src={avatar} alt="" className="w-8 h-8 rounded-full" />}
        <div className="flex items-center gap-2 min-w-0">
          {platformIcon}
          <span className="text-sm font-semibold text-gray-800 truncate">{owner}/{repo}</span>
        </div>
      </div>
      {description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {stars}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 3a3 3 0 00-3 3v2.6a3 3 0 002 2.83V18a3 3 0 006 0v-1h2v1a3 3 0 006 0v-6.57a3 3 0 002-2.83V6a3 3 0 00-3-3H6zm0 2h5v2.6a1 1 0 01-1 1H7a1 1 0 01-1-1V5zm7 0h5v2.6a1 1 0 01-1 1h-3a1 1 0 01-1-1V5zM7 12h3a3 3 0 003-2.4V15H9v3a1 1 0 01-2 0v-6zm7-2.4A3 3 0 0017 12v6a1 1 0 002 0v-3h-2V9.6z" />
          </svg>
          {forks}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {watchers}
        </span>
        {lastCommit && (
          <span>最近提交: {formatTime(lastCommit)}</span>
        )}
      </div>
    </a>
  );
}
