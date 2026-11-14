import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type {
  AccessibilityReportDTO,
  CalculatedRouteDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';
import { useAppStore } from '../../store/useAppStore.ts';

interface CampusMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
  reports?: AccessibilityReportDTO[];
  routes?: CalculatedRouteDTO[];
  selectedOriginId?: string;
  selectedDestinationId?: string;
  onSelectLocation?: (location: LocationNodeDTO) => void;
  heightClass?: string;
  showBarriers?: boolean;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  centerLat,
  centerLng,
  zoom = 17,
  locations,
  edges,
  reports = [],
  routes = [],
  selectedOriginId,
  selectedDestinationId,
  onSelectLocation,
  heightClass = 'h-[480px]',
  showBarriers = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
    });
    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, [centerLat, centerLng, zoom]);

  // Manage OSM Tile Layer vs Low Bandwidth mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (!lowBandwidth) {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
    }
  }, [lowBandwidth]);

  // Render graph edges, routes, location markers, and barrier pins
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const nodeMap = new Map(locations.map((n) => [n.id, n]));

    // 1. Base Campus Path Edges
    for (const edge of edges) {
      const from = nodeMap.get(edge.fromNodeId);
      const to = nodeMap.get(edge.toNodeId);
      if (!from || !to) continue;

      let color = '#147D78';
      let dashArray: string | undefined = undefined;
      let weight = 4;
      let opacity = 0.72;

      if (edge.status === 'blocked' || edge.temporaryClosure) {
        color = '#B91C1C';
        dashArray = '6, 6';
        weight = 5;
        opacity = 0.85;
      } else if (edge.hasStairs) {
        color = '#64748B';
        dashArray = '2, 6';
        weight = 3;
      } else if (edge.verificationStatus !== 'verified') {
        color = '#94A3B8';
        dashArray = '4, 6';
        weight = 3;
      } else if (edge.status === 'caution') {
        color = '#D97706';
        dashArray = '8, 4';
        weight = 4;
      }

      const poly = L.polyline(
        [
          [from.lat, from.lng],
          [to.lat, to.lng],
        ],
        { color, weight, dashArray, opacity }
      );
      poly.bindPopup(
        `<div style="font-size:12px;line-height:1.45;">
          <strong>${edge.name}</strong><br/>
          Distance: ${edge.distanceMeters}m · Width: ${edge.widthMeters}m · Slope: ${edge.slopePercent}%<br/>
          Surface: ${edge.surface.replace(/_/g, ' ')}<br/>
          Status: <strong>${edge.status.toUpperCase()}</strong> (${edge.verificationStatus})
          ${edge.hasStairs ? `<br/><span style="color:#991B1B;">Contains ${edge.stairCount} stairs</span>` : ''}
          ${edge.closureReason ? `<br/><span style="color:#991B1B;">Note: ${edge.closureReason}</span>` : ''}
        </div>`
      );
      poly.addTo(group);
    }

    // 2. Calculated Accessible Routes (Alternative first, then Primary on top)
    const sortedRoutes = [...routes].sort((a, b) => (a.isPrimary ? 1 : -1) - (b.isPrimary ? 1 : -1));
    for (const route of sortedRoutes) {
      if (route.coordinates.length < 2) continue;
      const line = L.polyline(route.coordinates, {
        color: route.isPrimary ? '#123B56' : '#2DB89A',
        weight: route.isPrimary ? 7 : 5,
        dashArray: route.isPrimary ? undefined : '10, 6',
        opacity: route.isPrimary ? 0.95 : 0.85,
      });
      line.bindPopup(
        `<div style="font-size:12px;">
          <strong>${route.label}</strong><br/>
          Est. ${route.totalDistanceMeters}m · ~${route.estimatedMinutes} min
        </div>`
      );
      line.addTo(group);
    }

    // 3. Location Nodes
    for (const loc of locations) {
      const isOrigin = loc.id === selectedOriginId;
      const isDest = loc.id === selectedDestinationId;
      const fillColor = isOrigin
        ? '#123B56'
        : isDest
        ? '#2DB89A'
        : loc.isAccessibleEntrance
        ? '#147D78'
        : '#64748B';

      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: isOrigin || isDest ? 10 : 7,
        fillColor,
        color: '#FFFFFF',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 1,
      });

      marker.bindTooltip(`${loc.name}${loc.code ? ` (${loc.code})` : ''}`, {
        direction: 'top',
        offset: [0, -6],
      });

      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.45;min-width:190px;">
          <strong>${loc.name}</strong><br/>
          <span style="color:#526375;">${loc.type.toUpperCase()} · Floor ${loc.floor}</span><br/>
          <p style="margin:4px 0;">${loc.description}</p>
          <span>Step-free entrance: ${loc.isAccessibleEntrance ? 'Yes' : 'No'}</span><br/>
          <span>Elevator: ${loc.hasElevator ? 'Yes' : 'No'} · Restroom: ${loc.hasAccessibleRestroom ? 'Yes' : 'No'}</span>
        </div>`
      );

      marker.on('click', () => {
        if (onSelectLocation) onSelectLocation(loc);
      });
      marker.addTo(group);
    }

    // 4. Open Barrier Markers
    if (showBarriers) {
      const activeReports = reports.filter(
        (r) =>
          typeof r.lat === 'number' &&
          typeof r.lng === 'number' &&
          !['resolved', 'rejected', 'duplicate'].includes(r.status)
      );
      for (const rep of activeReports) {
        const barrierMarker = L.circleMarker([rep.lat!, rep.lng!], {
          radius: 7,
          fillColor: rep.priority === 'critical' ? '#B91C1C' : '#D97706',
          color: '#FFFFFF',
          weight: 2,
          fillOpacity: 0.95,
        });
        barrierMarker.bindPopup(
          `<div style="font-size:12px;line-height:1.4;max-width:220px;">
            <strong style="color:#991B1B;">Barrier: ${rep.title}</strong><br/>
            Status: ${rep.status.replace(/_/g, ' ')} · Priority: ${rep.priority}<br/>
            Location: ${rep.locationLabel}
          </div>`
        );
        barrierMarker.addTo(group);
      }
    }
  }, [
    locations,
    edges,
    reports,
    routes,
    selectedOriginId,
    selectedDestinationId,
    onSelectLocation,
    showBarriers,
  ]);

  return (
    <div className="space-y-3">
      <div
        className={`relative w-full ${heightClass} rounded-xl border border-[var(--ap-border)] overflow-hidden bg-[var(--ap-surface-2)]`}
      >
        <div
          ref={containerRef}
          className="w-full h-full"
          role="region"
          aria-label="Interactive Campus Accessibility Map"
        />
        {lowBandwidth && (
          <div className="absolute top-3 right-3 z-[400] bg-[var(--ap-surface)] border border-[var(--ap-border)] px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--ap-text)]">
            Low Bandwidth Mode: Map tiles paused (graph overlay active)
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--ap-muted)] px-1"
        aria-label="Map legend"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-1 bg-[#18C6AD] inline-block rounded" aria-hidden="true" />
          Recommended Route (Solid)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-1 bg-[#147D78] inline-block rounded" aria-hidden="true" />
          Verified Step-Free Path
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b-2 border-dashed border-[#D97706] inline-block" aria-hidden="true" />
          Caution Surface
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b-2 border-dashed border-[#EF4444] inline-block" aria-hidden="true" />
          Blocked / Closed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b-2 border-dotted border-[#64748B] inline-block" aria-hidden="true" />
          Stairs (Excluded in Step-Free)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-b-2 border-dashed border-[#94A3B8] inline-block" aria-hidden="true" />
          Unverified Path
        </span>
      </div>
    </div>
  );
};
