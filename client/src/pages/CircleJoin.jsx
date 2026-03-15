import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CircleJoin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [circleId, setCircleId] = useState(null);
  const [circleName, setCircleName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const join = async () => {
      try {
        const data = await api.joinCircle(token);
        setCircleId(data.circle_id || data.circleId || data.id);
        setCircleName(data.circle_name || data.name || '');
        setStatus('success');
      } catch (err) {
        setErrorMsg(err.message || '加入失败');
        setStatus('error');
      }
    };
    join();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">正在加入圈子...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">加入成功</h2>
            {circleName && (
              <p className="text-gray-500 mb-6">已成功加入「{circleName}」</p>
            )}
            <button
              onClick={() => navigate(circleId ? `/circles/${circleId}` : '/circles')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              进入圈子
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">加入失败</h2>
            <p className="text-gray-500 mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate('/circles')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              返回圈子列表
            </button>
          </>
        )}
      </div>
    </div>
  );
}
