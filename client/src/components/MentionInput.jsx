import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { api } from '../api';

const MentionInput = forwardRef(function MentionInput(
  { value, onChange, placeholder, rows = 4, className = '', ...props },
  ref
) {
  const textareaRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const debounceRef = useRef(null);

  useImperativeHandle(ref, () => textareaRef.current);

  const searchUsers = useCallback(async (query) => {
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const users = await api.searchUsers(query);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
      setSelectedIndex(0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const detectMention = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = value.slice(0, cursorPos);

    // Find the last @ that isn't part of a completed mention @[...](...)
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    // Check if this @ is already inside a completed mention
    const afterAt = value.slice(atIndex);
    if (/^@\[[^\]]+\]\(\d+\)/.test(afterAt)) {
      setShowSuggestions(false);
      return;
    }

    const query = textBefore.slice(atIndex + 1);
    // Only trigger if query has no spaces and is reasonable length
    if (query.length > 20 || /\s/.test(query)) {
      setShowSuggestions(false);
      return;
    }

    setMentionQuery(query);
    setMentionStart(atIndex);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(query), 300);
  }, [value, searchUsers]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectUser = useCallback((user) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const mention = `@[${user.nickname || user.username}](${user.id}) `;
    const newValue = before + mention + after;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);

    // Set cursor position after mention
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const pos = before.length + mention.length;
        textarea.focus();
        textarea.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [value, onChange, mentionStart, mentionQuery]);

  const handleKeyDown = (e) => {
    if (!showSuggestions) {
      if (props.onKeyDown) props.onKeyDown(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[selectedIndex]) {
        e.preventDefault();
        selectUser(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    } else {
      if (props.onKeyDown) props.onKeyDown(e);
    }
  };

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  useEffect(() => {
    detectMention();
  }, [value, detectMention]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${className}`}
      />
      {showSuggestions && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-indigo-50' : ''
              }`}
            >
              <img
                src={user.avatar || '/default-avatar.png'}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-medium text-gray-800">{user.nickname || user.username}</span>
              {user.nickname && (
                <span className="text-gray-400 text-xs">@{user.username}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default MentionInput;
