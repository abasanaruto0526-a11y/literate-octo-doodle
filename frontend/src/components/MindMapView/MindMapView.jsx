import { useMemo, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './MindMapView.css';

const EMOTION_COLORS = {
  positive: '#4ecdc4',
  negative: '#ff6584',
  excited: '#f0a060',
  neutral: '#8892b0'
};

export function MindMapView({ notes }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      // 幅に少し余裕を持たせるか、そのまま使う
      if (width && height) {
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const tagMap = new Map();

    nodes.push({ id: 'root', name: '私の記録', val: 8, color: '#6c8fff', type: 'root' });

    notes.forEach(note => {
      // ノート自体
      nodes.push({
        id: note.id,
        name: note.title,
        val: 4,
        color: EMOTION_COLORS[note.emotion] || EMOTION_COLORS.neutral,
        type: 'note'
      });
      links.push({ source: 'root', target: note.id, value: 1, color: 'rgba(255,255,255,0.1)' });

      // タグ
      (note.tags || []).forEach(tag => {
        if (!tagMap.has(tag)) {
          const tagNodeId = `tag-${tag}`;
          tagMap.set(tag, { id: tagNodeId, name: tag, val: 2, color: 'rgba(255,255,255,0.5)', type: 'tag' });
          nodes.push(tagMap.get(tag));
        }
        links.push({ source: note.id, target: `tag-${tag}`, value: 0.5, color: EMOTION_COLORS[note.emotion] });
      });
    });

    return { nodes, links };
  }, [notes]);

  return (
    <div className="mindmap-container glass-card" ref={containerRef}>
      <div className="mindmap-overlay">
        <h3>🧠 アタマの中のネットワーク</h3>
        <p>記録とキーワードのつながり</p>
      </div>

      {notes.length === 0 ? (
        <div className="empty-mindmap">ノートがありません</div>
      ) : (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeRelSize={6}
          linkColor={link => link.color}
          linkOpacity={0.6}
          d3VelocityDecay={0.1}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = node.type === 'note' ? 12 / globalScale : 10 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;

            // 丸を描画
            ctx.fillStyle = node.color;
            ctx.beginPath();
            if (node.type === 'root') {
              ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
            } else if (node.type === 'tag') {
              ctx.arc(node.x, node.y, 3, 0, 2 * Math.PI, false);
            } else {
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            }
            ctx.fill();

            // テキストラベル
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.type === 'note' ? 'rgba(255,255,255,0.9)' : 'rgba(200,200,200,0.8)';
            const yOffset = node.type === 'root' ? 14 : 9;
            ctx.fillText(label, node.x, node.y + yOffset);
          }}
        />
      )}
    </div>
  );
}
