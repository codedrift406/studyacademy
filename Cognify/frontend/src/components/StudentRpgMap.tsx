import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, MapPin, Play, Star } from 'lucide-react';
import styles from './StudentRpgMap.module.css';

interface CourseNode {
  id: string;
  title: string;
  progressPercent: number;
  status: 'locked' | 'active' | 'completed';
}

interface RpgMapProps {
  courses: CourseNode[];
}

export const StudentRpgMap: React.FC<RpgMapProps> = memo(({ courses }) => {
  const navigate = useNavigate();

  const rowHeight = 200; // Increased for better visual spacing
  const xPositions = [28, 72]; // 2-column layout to prevent "overflow right"

  const generateCoordinates = (index: number) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const isEvenRow = row % 2 === 0;
    
    // Snake/Zig-zag pattern: Row 0: L->R, Row 1: R->L
    const x = isEvenRow ? xPositions[col] : xPositions[1 - col];
    const y = 100 + row * rowHeight;
    
    return { x, y };
  };

  const nodes = useMemo(() => {
    const data = courses.length > 0 ? courses : [
      { id: '1', title: 'Start your journey', progressPercent: 0, status: 'active' as const },
      { id: '2', title: 'Explore further', progressPercent: 0, status: 'locked' as const },
      { id: '3', title: 'Master the craft', progressPercent: 0, status: 'locked' as const },
    ];
    
    return data.map((c, i) => ({ ...c, ...generateCoordinates(i) }));
  }, [courses]);

  const totalHeight = useMemo(() => {
    const rowCount = Math.ceil(nodes.length / 2);
    return rowCount * rowHeight + 150;
  }, [nodes]);

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapBackground} style={{ height: totalHeight, minHeight: '100%' }}>
        {/* SVG background grid/terrain simulation */}
        <svg width="100%" height={totalHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            </pattern>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
            {/* Dynamic Biome Gradients */}
            <radialGradient id="biome1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Ambient atmosphere circles (Nebulas) */}
          <motion.circle 
            cx="20%" cy="200" r="250" fill="url(#biome1)" 
            animate={{ x: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }} 
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.circle 
            cx="80%" cy={totalHeight - 200} r="300" fill="url(#nodeGlow)" 
            animate={{ x: [0, -50, 0], opacity: [0.2, 0.5, 0.2] }} 
            transition={{ duration: 12, repeat: Infinity }}
          />
        </svg>

        {/* Connection Paths Layer */}
        <svg 
          className={styles.pathsLayer} 
          width="100%" 
          height={totalHeight} 
          style={{ filter: 'drop-shadow(0 0 15px var(--primary-glow))' }}
        >
          {nodes.map((node, i) => {
            if (i === nodes.length - 1) return null;
            const nextNode = nodes[i + 1];
            const isCompleted = node.status === 'completed' && nextNode.status !== 'locked';
            
            // Organic serpentine curve logic
            const isHorizontal = Math.abs(nextNode.x - node.x) > 20;
            const midX = (node.x + nextNode.x) / 2;
            const midY = (node.y + nextNode.y) / 2;
            
            // Control points for a smooth recursive "S" shape
            const controlX = isHorizontal ? midX : node.x + (i % 2 === 0 ? 15 : -15);
            const controlY = isHorizontal ? node.y + (nextNode.y - node.y) * 0.2 : midY;

            const pathData = `M ${node.x}% ${node.y} Q ${controlX}% ${controlY} ${nextNode.x}% ${nextNode.y}`;

            return (
              <motion.path
                key={`path-${i}`}
                d={pathData}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                className={`${styles.pathLine} ${isCompleted ? styles.pathActive : ''}`}
                stroke={isCompleted ? 'var(--primary)' : 'rgba(255,255,255,0.06)'}
                strokeWidth={isCompleted ? 5 : 2}
                transition={{ duration: 1.5, delay: i * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Nodes / Islands */}
        {nodes.map((node, i) => {
          const isCompleted = node.status === 'completed';
          const isActive = node.status === 'active';
          
          return (
            <motion.div
              key={node.id}
              className={`${styles.islandNode} ${styles[node.status]}`}
              style={{ left: `${node.x}%`, top: `${node.y}px` }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              whileHover={isActive || isCompleted ? { scale: 1.1, y: -8 } : {}}
              onClick={() => {
                if (isActive || isCompleted) navigate(`/course/${node.id}`);
              }}
            >
              {isActive && (
                <motion.div 
                   className={styles.playerAvatar}
                   animate={{ y: [-10, 10, -10] }}
                   transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <MapPin size={40} className={styles.pinIcon} />
                  <div className={styles.pinPulse} />
                </motion.div>
              )}

              <div className={`${styles.base} ${isCompleted ? styles.baseCompleted : isActive ? styles.baseActive : ''}`}>
                <div className={styles.innerGlow} />
                {isCompleted ? <Star size={26} fill="currentColor" /> : isActive ? <Play size={26} fill="currentColor" /> : <Lock size={22} />}
              </div>
              
              <div className={styles.islandTooltip}>
                <p className={styles.islandTitle}>{node.title}</p>
                {(isActive || isCompleted) && (
                  <div className={styles.islandProgressWrap}>
                    <div className={styles.islandProgress}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${node.progressPercent}%` }}
                        transition={{ duration: 1.2, delay: 0.8 }}
                      />
                    </div>
                    <span className={styles.progressText}>{node.progressPercent}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
