import { useState } from 'react';

export default function VideoPlayer({ url, poster }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
        预览失败，请检查视频来源
      </div>
    );
  }

  if (!playing) {
    return (
      <div
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-pointer group"
        onClick={() => setPlaying(true)}
      >
        {poster && (
          <img src={poster} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={url}
        controls
        autoPlay
        className="w-full h-full"
        onError={() => setError(true)}
      />
    </div>
  );
}
