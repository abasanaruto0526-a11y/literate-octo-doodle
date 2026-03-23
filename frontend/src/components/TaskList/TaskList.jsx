import { useState } from 'react';
import './TaskList.css';

const PRIORITY_CONFIG = {
  high:   { label: '高', color: 'var(--color-recording)', bg: 'rgba(255,101,132,0.12)' },
  medium: { label: '中', color: 'var(--color-primary)',   bg: 'rgba(108,143,255,0.12)' },
  low:    { label: '低', color: 'var(--color-teal)',      bg: 'rgba(78,205,196,0.12)'  },
};

export function TaskList({ tasks, onToggle, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = tasks.filter(t => t.done).length;

  if (tasks.length === 0) return null;

  return (
    <div className="task-list glass-card">
      <div className="task-header" onClick={() => setCollapsed(c => !c)}>
        <div className="task-title">
          <span>✅</span>
          <span>自動検出されたタスク</span>
          <span className="task-count">{doneCount}/{tasks.length}</span>
        </div>
        <span className="task-toggle">{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div className="task-items">
          {tasks.map(task => {
            const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            return (
              <div
                key={task.id}
                className={`task-item ${task.done ? 'done' : ''}`}
              >
                <button
                  className="task-check"
                  onClick={() => onToggle(task.id)}
                  style={{ borderColor: pCfg.color }}
                >
                  {task.done && <span style={{ color: pCfg.color }}>✓</span>}
                </button>
                <span className="task-text">{task.text}</span>
                <span
                  className="task-priority"
                  style={{ color: pCfg.color, background: pCfg.bg }}
                >
                  {pCfg.label}
                </span>
                <button
                  className="task-delete"
                  onClick={() => onDelete(task.id)}
                >×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
