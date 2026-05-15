import { useEffect, useRef, useState } from 'react';
import { Camera, Users, AlertTriangle, MonitorPlay, Cctv } from 'lucide-react';
import { Card } from '../components/Shared';

type CameraFeed = {
  id: number;
  name: string;
  source: string;
  status: string;
  count: number;
  last_seen: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const Monitor = () => {
  const [crowdCount, setCrowdCount] = useState(0);
  const [cameraFeeds, setCameraFeeds] = useState<CameraFeed[]>([]);
  const [systemMode, setSystemMode] = useState<string>('cctv');
  const [cameraName, setCameraName] = useState('');
  const [cameraSource, setCameraSource] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('auto');
  const [connectMessage, setConnectMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [backendMessage, setBackendMessage] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isLoadingCameras = useRef(false);
  const retryDelayMs = useRef(2500);
  const retryTimeout = useRef<number | null>(null);
  const density = crowdCount < 1000 ? 'Low' : crowdCount < 2000 ? 'Medium' : 'High';
  
  const refreshCameras = async () => {
    const response = await fetch(`${API_BASE}/cameras`);
    if (!response.ok) {
      throw new Error(`cameras_endpoint_${response.status}`);
    }
    const data = await response.json();
    setCameraFeeds(data.cameras ?? []);
    setCrowdCount(data.total_people ?? 0);
    setSystemMode(data.system_mode || 'cctv');
    setBackendMessage('');
  };

  useEffect(() => {
    const loadCameras = () => {
      if (isLoadingCameras.current || document.visibilityState === 'hidden') {
        return;
      }
      isLoadingCameras.current = true;
      fetch(`${API_BASE}/cameras`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`cameras_endpoint_${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setCameraFeeds(data.cameras ?? []);
          setCrowdCount(data.total_people ?? 0);
          setSystemMode(data.system_mode || 'cctv');
          setBackendMessage('');
          retryDelayMs.current = 2500;
        })
        .catch(() => {
          setBackendMessage('Backend camera API unavailable. Restart backend server to load latest routes.');
          retryDelayMs.current = Math.min(retryDelayMs.current * 2, 15000);
        })
        .finally(() => {
          isLoadingCameras.current = false;
          if (retryTimeout.current !== null) {
            window.clearTimeout(retryTimeout.current);
          }
          retryTimeout.current = window.setTimeout(loadCameras, retryDelayMs.current);
        });
    };

    loadCameras();
    const onFocus = () => loadCameras();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      if (retryTimeout.current !== null) {
        window.clearTimeout(retryTimeout.current);
      }
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (systemMode === 'demo' && localStream && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      interval = window.setInterval(() => {
        if (video.videoWidth > 0 && ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.8);
          fetch(`${API_BASE}/demo_frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
          }).then(res => res.json())
            .then(data => console.log("Demo frame AI response:", data))
            .catch(() => {});
        }
      }, 500); // 2 FPS for AI demo
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [systemMode, localStream]);

  // Auto-resume webcam if in demo mode but stream is lost (e.g. after tab switch)
  useEffect(() => {
    let isActive = true;
    if (systemMode === 'demo' && !localStream) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (isActive) {
            setLocalStream(stream);
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        })
        .catch(err => console.error("Webcam auto-resume error:", err));
    }
    return () => {
      isActive = false;
    };
  }, [systemMode, localStream]);

  // Clean up webcam tracks on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [localStream]);

  const toggleMode = async () => {
    const newMode = systemMode === 'cctv' ? 'demo' : 'cctv';
    
    if (newMode === 'demo') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setLocalStream(stream);
      } catch (err) {
        console.error("Webcam error:", err);
        alert("Please allow webcam access for Demo Mode");
        return;
      }
    } else {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
    }

    try {
      await fetch(`${API_BASE}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      await refreshCameras();
    } catch (e) {
      console.error(e);
      setBackendMessage('Failed to toggle mode');
    }
  };

  const primaryCamera = cameraFeeds[0];
  const secondaryCameras = cameraFeeds.slice(1);
  const activeCameras = cameraFeeds.filter((cam) => cam.status === 'active').length;

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectMessage('');
    try {
      const payload: { source: string; name?: string; slot?: number } = {
        source: cameraSource,
      };
      if (cameraName.trim()) {
        payload.name = cameraName.trim();
      }
      if (selectedSlot !== 'auto') {
        payload.slot = Number(selectedSlot);
      }

      const response = await fetch(`${API_BASE}/cameras/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'connect_failed');
      }
      setConnectMessage(`Connected ${data.camera?.name || 'camera'} successfully.`);
      setCameraSource('');
      setCameraName('');
      await refreshCameras();
    } catch (error) {
      console.error(error);
      setConnectMessage('Could not connect camera. Check the source URL or device index.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (cameraId: number) => {
    await fetch(`${API_BASE}/cameras/${cameraId}/disconnect`, { method: 'POST' });
    await refreshCameras();
  };

  const handleRemoveSlot = async (cameraId: number) => {
    if (!window.confirm('Are you sure you want to remove this camera slot entirely?')) return;
    try {
      const response = await fetch(`${API_BASE}/cameras/${cameraId}/remove`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'remove_failed');
      
      await refreshCameras();
      alert(`Slot "${data.removed}" removed successfully.`);
      setConnectMessage('Camera slot removed.');
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setConnectMessage(`Could not remove camera slot: ${error.message}`);
    }
  };

  const handleAddSlot = async () => {
    setConnectMessage('');
    try {
      const response = await fetch(`${API_BASE}/cameras/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cameraName.trim() || undefined }),
      });
      if (!response.ok) {
        throw new Error('add_slot_failed');
      }
      await refreshCameras();
      setConnectMessage('New CCTV slot added. Connect a feed source when ready.');
      setCameraName('');
    } catch (error) {
      console.error(error);
      setConnectMessage('Could not add CCTV slot.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black">Live Crowd Monitor</h1>
          <p className="text-slate-500 font-medium">Real-time computer vision analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMode}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-slate-900 rounded-xl font-bold transition-colors ${
              systemMode === 'demo' ? 'bg-purple-200 text-purple-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            {systemMode === 'demo' ? <MonitorPlay size={20} /> : <Cctv size={20} />}
            {systemMode === 'demo' ? 'DEMO MODE ACTIVE' : 'SWITCH TO DEMO MODE'}
          </button>

          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 border-2 border-slate-900 rounded-xl font-bold text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            ANALYSIS ENGINE
          </div>
        </div>
      </div>

      {systemMode === 'cctv' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black">Connect IoT CCTV Feed</h2>
              <p className="text-sm text-slate-500 font-medium">Use CCTV/NVR stream URLs (RTSP/HTTP/HLS) so monitoring and prediction share the same live camera pipeline.</p>
              {backendMessage && (
                <p className="text-xs font-bold text-red-600 mt-2">{backendMessage}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="Camera name (optional)"
                className="px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium"
              />
              <input
                value={cameraSource}
                onChange={(e) => setCameraSource(e.target.value)}
                placeholder="Source: 0 / http://... / rtsp://..."
                className="md:col-span-2 px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium"
              />
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl font-medium"
              >
                <option value="auto">Auto slot</option>
                {cameraFeeds.map((feed) => (
                  <option key={feed.id} value={String(feed.id)}>
                    {feed.name}
                  </option>
                ))}
                <option value={String(cameraFeeds.length)}>Add new slot</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleConnect}
                disabled={isConnecting || !cameraSource.trim()}
                className="neo-button neo-button-primary disabled:opacity-60"
              >
                {isConnecting ? 'Connecting...' : 'Connect Feed'}
              </button>
              <button onClick={handleAddSlot} className="neo-button">
                Add CCTV Slot
              </button>
              {connectMessage && <p className="text-sm font-bold text-slate-600">{connectMessage}</p>}
            </div>
          </div>
        </Card>
      )}

      {systemMode === 'demo' && (
        <div className="bg-purple-100 border-2 border-purple-900 p-4 rounded-xl flex items-start gap-4">
          <MonitorPlay className="text-purple-700 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-purple-900">Demo Mode Running</h3>
            <p className="text-sm text-purple-800">The system is currently using your local laptop webcam (Device 0). CCTV inputs are isolated and ignored in this mode. Spatial deduplication is disabled since there is only one view.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="aspect-video bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative group p-0">
            <div className="scanline"></div>
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold animate-pulse z-10">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              {systemMode === 'demo' ? 'LOCAL WEBCAM - AI DEMO' : (primaryCamera?.name?.toUpperCase() || 'CAMERA 1 - LIVE')}
            </div>

            {/* Hidden canvas for extracting frames */}
            <canvas ref={canvasRef} className="hidden" />

            {systemMode === 'demo' && (
              <video 
                ref={(vid) => {
                  videoRef.current = vid;
                  if (vid && localStream) {
                    vid.srcObject = localStream;
                  }
                }}
                autoPlay 
                playsInline 
                muted
                className="absolute opacity-0 w-1 h-1 pointer-events-none"
              />
            )}

            {systemMode === 'demo' || primaryCamera ? (
              <img
                key={systemMode === 'demo' ? 'demo-cam' : `${primaryCamera!.id}-${primaryCamera!.source}`}
                src={`${API_BASE}/video_feed/${systemMode === 'demo' ? '999' : primaryCamera!.id}`}
                alt="Live feed"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Camera size={64} className="text-slate-700" />
                <p className="text-xs text-slate-300 font-bold">
                  {primaryCamera ? 'NO FOOTAGE' : 'NO CAMERA CONFIGURED'}
                </p>
              </div>
            )}
            
            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-md p-4 flex justify-between items-center text-white font-mono text-xs z-10">
              <span>LAT: 21.4225° N | LONG: 39.8262° E</span>
              <span>DETECTED OBJECTS: {crowdCount} PERSONS | {systemMode === 'demo' ? 'DEMO_MODE' : (primaryCamera?.status?.toUpperCase() ?? 'NO_CAMERA')}</span>
            </div>
            {primaryCamera && systemMode === 'cctv' && (
              <div className="absolute bottom-14 left-4 flex gap-2 z-10">
                <button
                  onClick={() => handleDisconnect(primaryCamera.id)}
                  className="text-[10px] text-white bg-black/50 hover:bg-black/70 px-3 py-1 rounded uppercase font-bold transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => handleRemoveSlot(primaryCamera.id)}
                  className="text-[10px] text-white bg-red-600/70 hover:bg-red-600 px-3 py-1 rounded uppercase font-bold transition-colors"
                >
                  Remove Slot
                </button>
              </div>
            )}
          </Card>

          {/* Sub Camera Feeds */}
          {systemMode === 'cctv' && secondaryCameras.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {secondaryCameras.map((feed) => (
                 <Card key={feed.id} className="bg-slate-900 aspect-video flex flex-col items-center justify-center relative p-0 overflow-hidden group border-slate-700">
                    <div className="scanline"></div>
                    <div className="absolute top-2 left-2 bg-black/50 text-[8px] text-white px-2 py-0.5 rounded uppercase font-bold z-10">
                      {feed.name}
                    </div>
                    {feed.status === 'active' || feed.status === 'reconnecting' || feed.status === 'no_signal' ? (
                      <img
                        key={`${feed.id}-${feed.source}`}
                        src={`${API_BASE}/video_feed/${feed.id}`}
                        alt={`${feed.name} feed`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Camera size={24} className="text-white/40 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-white/70">NO FOOTAGE</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 text-[8px] text-white/30 font-mono">
                      STATUS: {feed.status.toUpperCase()}
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                      <button
                        onClick={() => handleDisconnect(feed.id)}
                        className="text-[8px] text-white bg-black/50 hover:bg-black/70 px-2 py-1 rounded uppercase font-bold transition-colors"
                      >
                        Disconnect
                      </button>
                      <button
                        onClick={() => handleRemoveSlot(feed.id)}
                        className="text-[8px] text-white bg-red-600/70 hover:bg-red-600 px-2 py-1 rounded uppercase font-bold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                 </Card>
               ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs">
                {systemMode === 'demo' ? 'Demo Mode Count' : 'Deduplicated Count'}
              </span>
              <Users className="text-blue-500" size={20} />
            </div>
            <div className="text-5xl font-black mb-1">{crowdCount.toLocaleString()}</div>
            <div className="text-xs font-bold text-slate-500 uppercase">{activeCameras} active of {cameraFeeds.length} cameras</div>
            <div className="mt-4">
              <div className={`text-center py-2 rounded-lg border-2 border-slate-900 font-bold text-sm ${
                density === 'Low' ? 'bg-green-200' : density === 'Medium' ? 'bg-yellow-200' : 'bg-red-200'
              }`}>
                {density} DENSITY
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-500 uppercase text-xs">Flow Control</span>
              <AlertTriangle className="text-yellow-500" size={20} />
            </div>
            <div className="space-y-3">
              {cameraFeeds.map((feed) => (
                <div key={feed.id} className="group flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{feed.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {feed.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded border border-slate-900 font-bold ${
                      feed.status === 'active' ? 'bg-green-200' : feed.status === 'reconnecting' ? 'bg-yellow-200' : 'bg-red-200'
                    }`}>
                      {feed.status.toUpperCase()}
                    </span>
                    <button 
                      onClick={() => handleRemoveSlot(feed.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                      title="Remove Slot"
                    >
                      <AlertTriangle size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
