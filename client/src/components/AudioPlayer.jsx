import { useState } from 'react';

export default function AudioPlayer({ url, title }) {
  const [error, setError] = useState(false);

  return (
    <div className="w-full bg-gray-50 rounded-lg border p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{title || '音频'}</p>
        {error ? (
          <p className="text-xs text-red-400 mt-1">播放失败，请检查音频来源</p>
        ) : (
          <audio
            src={url}
            controls
            className="w-full mt-1"
            style={{ height: '32px' }}
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}
