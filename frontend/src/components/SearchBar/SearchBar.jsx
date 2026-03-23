import { useState } from 'react';
import './SearchBar.css';

export function SearchBar({ onSearch, noteCount }) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          id="input-search"
          type="text"
          className="search-input"
          placeholder="ノートを検索..."
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button className="search-clear" onClick={handleClear}>×</button>
        )}
      </div>
      {query && (
        <div className="search-hint">
          「{query}」の検索結果: {noteCount} 件
        </div>
      )}
    </div>
  );
}
