import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import busIcon from "../assets/bus_icon.png";
import styles from "./BusMap.module.css";

const center = { lat: 17.5028, lng: 78.3962 };

interface BusLocation {
    busId: string;
    latitude: number;
    longitude: number;
    locationName: string;
    isMoving: boolean;
}

const speedMetersPerSecond = 50;

const pathCoordinates = [
    { lat: 17.5028, lng: 78.3962, name: "JNTU Main Gate", stopDuration: 5000 },
    { lat: 17.5061, lng: 78.4116, name: "Miyapur Metro Station", stopDuration: 5000 },
    { lat: 17.5140, lng: 78.4239, name: "Bachupally Cross Road", stopDuration: 5000 },
    { lat: 17.5457, lng: 78.4316, name: "Pragathi Nagar Junction", stopDuration: 5000 },
    { lat: 17.5684, lng: 78.4485, name: "Dulapally Checkpost", stopDuration: 5000 },
    { lat: 17.5921, lng: 78.4607, name: "Kompally Junction", stopDuration: 5000 },
    { lat: 17.6186, lng: 78.4725, name: "Maisammaguda Stop", stopDuration: 5000 },
    { lat: 17.6322, lng: 78.4795, name: "Mallareddy College", stopDuration: 0 },
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const busMarkerIcon = new L.Icon({
    iconUrl: busIcon,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

const stopMarkerIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="%236366f1" stroke="%23ffffff" stroke-width="2"/></svg>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const BusMap: React.FC = () => {
    const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
    const [currentStatus, setCurrentStatus] = useState("Trip starting...");
    const [etaToNextStop, setEtaToNextStop] = useState<string>('');
    const [totalEtaToCollege, setTotalEtaToCollege] = useState<string>('');
    const routeIndex = useRef(0);
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const startTrip = () => {
            const animateStep = () => {
                const currentPoint = pathCoordinates[routeIndex.current];
                const nextPoint = pathCoordinates[routeIndex.current + 1];

                if (!nextPoint) {
                    setCurrentStatus(`Trip completed at ${currentPoint.name}`);
                    return;
                }

                setCurrentStatus(`Moving towards ${nextPoint.name}`);
                
                const segmentDuration = haversineDistance(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng) / speedMetersPerSecond;
                const startTime = performance.now();

                const animate = (time: number) => {
                    const elapsed = time - startTime;
                    const progress = Math.min(elapsed / (segmentDuration * 1000), 1);

                    const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * progress;
                    const lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * progress;

                    setBusLocation({
                        busId: "BUS-1",
                        latitude: lat,
                        longitude: lng,
                        locationName: `Near ${currentPoint.name}`,
                        isMoving: true,
                    });
                    
                    const remainingDistanceToNextStop = haversineDistance(
                        lat, lng,
                        nextPoint.lat, nextPoint.lng
                    );
                    const remainingDurationToNextStop = remainingDistanceToNextStop / speedMetersPerSecond;
                    setEtaToNextStop(`${Math.round(remainingDurationToNextStop)} seconds`);

                    let totalRemainingDistance = remainingDistanceToNextStop;
                    for (let i = routeIndex.current + 1; i < pathCoordinates.length - 1; i++) {
                        totalRemainingDistance += haversineDistance(
                            pathCoordinates[i].lat, pathCoordinates[i].lng,
                            pathCoordinates[i + 1].lat, pathCoordinates[i + 1].lng
                        );
                    }
                    const totalRemainingDuration = totalRemainingDistance / speedMetersPerSecond;
                    setTotalEtaToCollege(`${Math.round(totalRemainingDuration / 60)} minutes`);

                    if (progress < 1) {
                        animationFrameId.current = requestAnimationFrame(animate);
                    } else {
                        // Reached next stop
                        routeIndex.current++;
                        setBusLocation({
                            busId: "BUS-1",
                            latitude: nextPoint.lat,
                            longitude: nextPoint.lng,
                            locationName: nextPoint.name,
                            isMoving: false,
                        });

                        setCurrentStatus(`Stopping at ${nextPoint.name}`);
                        
                        // Wait for the stop duration, then start the next segment
                        if (nextPoint.stopDuration > 0) {
                            setTimeout(animateStep, nextPoint.stopDuration);
                        } else {
                            animateStep();
                        }
                    }
                };
                animationFrameId.current = requestAnimationFrame(animate);
            };

            // Set the initial bus location at the first stop
            setBusLocation({
                busId: "BUS-1",
                latitude: pathCoordinates[0].lat,
                longitude: pathCoordinates[0].lng,
                locationName: pathCoordinates[0].name,
                isMoving: false,
            });

            // Start the first animation after the initial stop duration
            setTimeout(animateStep, pathCoordinates[0].stopDuration);
        };

        startTrip();

        return () => {
            if (animationFrameId.current !== null) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Bus Tracking</h1>
            <div className={styles.statusBox}>
                <p className={styles.statusText}>
                    <strong>Current Status:</strong> {currentStatus}
                </p>
                {busLocation && (
                    <p className={styles.statusText}>
                        <strong>Current Location:</strong> {busLocation.locationName} ({busLocation.latitude.toFixed(4)}, {busLocation.longitude.toFixed(4)})
                    </p>
                )}
                <p className={styles.statusText}>
                    <strong>Next Stop:</strong> {pathCoordinates[routeIndex.current + 1]?.name || "Final Destination"}
                </p>
                <p className={styles.statusText}>
                    <strong>ETA to Next Stop:</strong> {etaToNextStop}
                </p>
                <p className={styles.statusText}>
                    <strong>Total ETA:</strong> {totalEtaToCollege}
                </p>
            </div>

            <MapContainer
                center={busLocation ? [busLocation.latitude, busLocation.longitude] : [center.lat, center.lng]}
                zoom={14}
                scrollWheelZoom={true}
                className={styles.mapContainer}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {busLocation && (
                    <Marker
                        position={[busLocation.latitude, busLocation.longitude]}
                        icon={busMarkerIcon}
                    />
                )}

                {pathCoordinates.map((stop, index) => (
                    <Marker
                        key={index}
                        position={[stop.lat, stop.lng]}
                        icon={stopMarkerIcon}
                    >
                        <Tooltip direction="bottom" offset={[0, 10]} opacity={1} permanent>
                            {stop.name}
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default BusMap;