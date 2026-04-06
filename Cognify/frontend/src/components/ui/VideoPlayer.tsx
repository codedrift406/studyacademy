import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitleTracks?: Array<{
    id: string;
    language: string;
    vttContent: string;
  }>;
  selectedTrackId?: string;
  onSubtitleChange?: (trackId: string) => void;
  thumbnail?: string;
}

export const VideoPlayer = ({
  src,
  title,
  subtitleTracks = [],
  selectedTrackId,
  onSubtitleChange,
  thumbnail,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      if (vol > 0) setIsMuted(false);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleEnded = () => setPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={styles.video}
        poster={thumbnail}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
        {subtitleTracks.map((track) => (
          <track
            key={track.id}
            kind="subtitles"
            srcLang={track.language}
            label={`Subtitles (${track.language.toUpperCase()})`}
            default={track.id === selectedTrackId}
            src={`data:text/vtt;charset=utf-8,${encodeURIComponent(track.vttContent)}`}
          />
        ))}
      </video>

      {/* Play overlay */}
      <div
        className={`${styles.playOverlay} ${playing ? styles.hidden : ''}`}
        onClick={togglePlay}
      >
        <div className={styles.playButton}>
          <Play size={48} fill="currentColor" />
        </div>
      </div>

      {/* Controls */}
      <div className={`${styles.controls} ${showControls ? styles.visible : styles.hidden}`}>
        {/* Progress bar */}
        <div className={styles.progressContainer}>
          <div className={styles.bufferedBar} style={{ width: `${buffered}%` }} />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className={styles.progressSlider}
            aria-label="Video progress"
          />
        </div>

        {/* Control buttons */}
        <div className={styles.controlsBottom}>
          <div className={styles.leftControls}>
            <button
              className={styles.button}
              onClick={togglePlay}
              title={playing ? 'Pause' : 'Play'}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>

            <div className={styles.volumeControl}>
              <button
                className={styles.button}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {showVolumeSlider && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  aria-label="Volume"
                />
              )}
            </div>

            {subtitleTracks.length > 0 && (
              <select
                value={selectedTrackId || ''}
                onChange={(e) => onSubtitleChange?.(e.target.value)}
                className={styles.subtitleSelect}
                title="Select subtitles"
              >
                <option value="">No subtitles</option>
                {subtitleTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.language.toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className={styles.rightControls}>
            <button
              className={styles.button}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      {title && <div className={`${styles.title} ${showControls ? styles.visible : ''}`}>{title}</div>}
    </div>
  );
};
