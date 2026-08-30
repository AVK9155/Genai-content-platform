import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/api';
import { Droplets, AlertTriangle, Activity } from 'lucide-react';

const riskColors: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const createIcon = (color: string) => L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function GISMap() {
  const [hotspots, setHotspots] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLayers, setShowLayers] = useState({ symptoms: true, water: true, risk: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/dashboard/hotspots');
      setHotspots(data);
    } catch {
      console.error('Failed to load hotspot data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GIS Hotspot Map</h1>
          <p className="text-gray-500">Disease clusters and contaminated water sources</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'symptoms', label: 'Cases', color: 'bg-red-500' },
            { key: 'water', label: 'Contaminated', color: 'bg-yellow-500' },
            { key: 'risk', label: 'Risk Zones', color: 'bg-purple-500' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setShowLayers({ ...showLayers, [key]: !showLayers[key as keyof typeof showLayers] })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showLayers[key as keyof typeof showLayers]
                  ? `${color} text-white`
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <MapContainer
          center={[26.2, 92.0]}
          zoom={7}
          style={{ height: '70vh', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Symptom clusters */}
          {showLayers.symptoms && hotspots?.clusters?.map((cluster: any, i: number) => {
            if (!cluster._avg.latitude || !cluster._avg.longitude) return null;
            const size = Math.min(10 + cluster._count.id * 3, 40);
            return (
              <CircleMarker
                key={`sym-${i}`}
                center={[cluster._avg.latitude, cluster._avg.longitude]}
                radius={size / 2}
                fillColor="#ef4444"
                fillOpacity={0.6}
                color="#dc2626"
                weight={2}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold">{cluster.village}</p>
                    <p className="text-sm text-red-600">{cluster._count.id} cases • {cluster._sum.affectedCount} affected</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Contaminated water sources */}
          {showLayers.water && hotspots?.contaminatedSources?.map((source: any) => (
            <Marker
              key={`water-${source.id}`}
              position={[source.latitude, source.longitude]}
              icon={createIcon('#eab308')}
            >
              <Popup>
                <div className="p-1">
                  <p className="font-bold">{source.name}</p>
                  <p className="text-sm text-yellow-600">⚠ Contaminated</p>
                  <p className="text-xs text-gray-500">{source.village}, {source.district}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Risk zones */}
          {showLayers.risk && hotspots?.riskScores?.map((risk: any) => {
            if (!risk.latitude || !risk.longitude) return null;
            return (
              <CircleMarker
                key={`risk-${risk.id}`}
                center={[risk.latitude, risk.longitude]}
                radius={20}
                fillColor={riskColors[risk.riskLevel]}
                fillOpacity={0.3}
                color={riskColors[risk.riskLevel]}
                weight={3}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold">{risk.village}</p>
                    <p className="text-sm" style={{ color: riskColors[risk.riskLevel] }}>
                      {risk.riskLevel} Risk ({Math.round(risk.score)}/100)
                    </p>
                    <p className="text-xs text-gray-500">{risk.district}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 opacity-60" />
          <span className="text-sm text-gray-600">Disease Cluster</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500" />
          <span className="text-sm text-gray-600">Contaminated Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-purple-500 opacity-60" />
          <span className="text-sm text-gray-600">Risk Zone</span>
        </div>
      </div>
    </div>
  );
}
