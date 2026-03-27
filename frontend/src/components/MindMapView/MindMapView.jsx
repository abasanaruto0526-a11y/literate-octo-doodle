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
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width && height) {
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);

    // アニメーションを永続的に回すためのループ
    let animFrame;
    const tick = () => {
      setFrame(f => f + 1);
      animFrame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrame);
    };
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

  const handleNodeClick = (node) => {
    if (node.type === 'note') {
      const fullNote = notes.find(n => n.id === node.id);
      setSelectedNode(fullNote);
      
      // フォーカスを合わせる
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3, 1000);
      }
    } else {
      setSelectedNode(null);
    }
  };

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
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeRelSize={6}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNode(null)}
          linkColor={link => link.color}
          linkOpacity={0.4}
          d3VelocityDecay={0.2}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = node.type === 'root' ? 14 / globalScale : (node.type === 'note' ? 11 / globalScale : 9 / globalScale);
            ctx.font = `${node.type === 'root' ? 'bold ' : ''}${fontSize}px 'Inter', sans-serif`;

            // パルシング周期の計算 (Date.now() を使用してアニメーションさせる)
            const t = Date.now() / 1000;
            const pulse = Math.sin(t * 2) * 0.2 + 0.8; // 0.6 ~ 1.0

            // 発光（グロー）エフェクトの設定
            ctx.shadowColor = node.color;
            ctx.shadowBlur = (node.type === 'root' ? 15 : 8) * pulse;

            // 丸を描画
            ctx.fillStyle = node.color;
            ctx.beginPath();
            let radius;
            if (node.type === 'root') radius = 8;
            else if (node.type === 'tag') radius = 3.5;
            else radius = 5.5;
            
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();

            // 発光を一度リセット（テキストに影響させすぎないため）
            ctx.shadowBlur = 0;

            // テキストラベル
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 下地の表示（可読性向上のため）
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.5);
            ctx.fillStyle = 'rgba(5, 10, 26, 0.6)';
            const labelYOffset = radius + (node.type === 'root' ? 8 : 6);
            
            // 角丸の背景を描画
            const rectX = node.x - bckgDimensions[0] / 2;
            const rectY = node.y + labelYOffset - bckgDimensions[1] / 2;
            const rectW = bckgDimensions[0];
            const rectH = bckgDimensions[1];
            const r = 4;
            ctx.beginPath();
            ctx.moveTo(rectX + r, rectY);
            ctx.lineTo(rectX + rectW - r, rectY);
            ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + r);
            ctx.lineTo(rectX + rectW, rectY + rectH - r);
            ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - r, rectY + rectH);
            ctx.lineTo(rectX + r, rectY + rectH);
            ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - r);
            ctx.lineTo(rectX, rectY + r);
            ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = node.type === 'root' ? '#ffffff' : (node.type === 'note' ? 'rgba(255,255,255,0.95)' : 'rgba(200,220,255,0.8)');
            ctx.fillText(label, node.x, node.y + labelYOffset);
          }}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link, ctx, globalScale) => {
            const startNode = link.source;
            const endNode = link.target;
            if (typeof startNode !== 'object' || typeof endNode !== 'object') return;

            // リンク本体の描画（ネオンのようなグロー）
            ctx.beginPath();
            ctx.moveTo(startNode.x, startNode.y);
            ctx.lineTo(endNode.x, endNode.y);
            ctx.strokeStyle = link.color;
            ctx.lineWidth = 1 / globalScale;
            ctx.setLineDash([2, 5]); // 点線でデジタル感を出す
            ctx.lineDashOffset = (Date.now() / 100) % 7;
            ctx.stroke();
            ctx.setLineDash([]); // リセット

            // リンクに流れる複数の光の粒を描画
            const PARTICLE_SPEED = 0.0008;
            const PARTICLE_RADIUS = 1.8 / globalScale;
            const numParticles = 2; // 粒子数

            for (let i = 0; i < numParticles; i++) {
              const t = ((Date.now() * PARTICLE_SPEED) + (i / numParticles)) % 1;
              const x = startNode.x + (endNode.x - startNode.x) * t;
              const y = startNode.y + (endNode.y - startNode.y) * t;

              ctx.beginPath();
              ctx.arc(x, y, PARTICLE_RADIUS, 0, 2 * Math.PI, false);
              ctx.fillStyle = link.color;
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }}
        />
      )}

      {selectedNode && (
        <div className="node-detail-overlay fadeInUp">
          <div className={`node-detail-panel glass-card emotion-${selectedNode.emotion}`}>
            <button className="close-panel-btn" onClick={() => setSelectedNode(null)}>×</button>
            <div className="detail-header">
              <span className="detail-emotion-icon">
                {selectedNode.emotion === 'positive' ? '😊' : 
                 selectedNode.emotion === 'negative' ? '😔' : 
                 selectedNode.emotion === 'excited' ? '🎉' : '😐'}
              </span>
              <div className="detail-title-group">
                <h4>{selectedNode.title}</h4>
                <span className="detail-date">{new Date(selectedNode.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="detail-content">{selectedNode.content}</p>
            <div className="detail-tags">
              {(selectedNode.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
