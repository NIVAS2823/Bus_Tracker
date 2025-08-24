import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
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

const BusMap: React.FC = () => {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
    const [currentStatus, setCurrentStatus] = useState("Trip starting...");
    const [etaToNextStop, setEtaToNextStop] = useState<string>('');
    const [totalEtaToCollege, setTotalEtaToCollege] = useState<string>('');
    const routeIndex = useRef(0);
    const animationFrameId = useRef<number | null>(null);
    const isMovingRef = useRef(false);

    useEffect(() => {
        if (!isLoaded || isMovingRef.current) return;

        const startMoving = () => {
            isMovingRef.current = true;

            const animateStep = () => {
                const currentPoint = pathCoordinates[routeIndex.current];
                const nextPoint = pathCoordinates[routeIndex.current + 1];

                if (!nextPoint) {
                    setCurrentStatus(`Trip completed at ${currentPoint.name}`);
                    isMovingRef.current = false;
                    return;
                }

                // --- FIX: Moved the calculation here ---
                const distanceToNextStop = haversineDistance(
                    currentPoint.lat, currentPoint.lng,
                    nextPoint.lat, nextPoint.lng
                );
                const durationToNextStopInSeconds = distanceToNextStop / speedMetersPerSecond;

                let totalRemainingDistance = distanceToNextStop;
                for (let i = routeIndex.current + 1; i < pathCoordinates.length - 1; i++) {
                    totalRemainingDistance += haversineDistance(
                        pathCoordinates[i].lat, pathCoordinates[i].lng,
                        pathCoordinates[i+1].lat, pathCoordinates[i+1].lng
                    );
                }
                const totalRemainingDurationInSeconds = totalRemainingDistance / speedMetersPerSecond;

                setEtaToNextStop(`ETA: ${Math.round(durationToNextStopInSeconds)} seconds`);
                setTotalEtaToCollege(`Total ETA: ${Math.round(totalRemainingDurationInSeconds / 60)} minutes`);
                // --- END FIX ---

                setCurrentStatus(`Moving towards ${nextPoint.name}`);

                const duration = durationToNextStopInSeconds * 1000;
                const startTime = performance.now();

                const animate = (time: number) => {
                    const elapsed = time - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * progress;
                    const lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * progress;

                    setBusLocation({
                        busId: "BUS-1",
                        latitude: lat,
                        longitude: lng,
                        locationName: `Near ${currentPoint.name}`,
                        isMoving: true,
                    });

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

                        if (nextPoint.stopDuration > 0) {
                            setTimeout(() => {
                                animateStep();
                            }, nextPoint.stopDuration);
                        } else {
                            animateStep();
                        }
                    }
                };

                animationFrameId.current = requestAnimationFrame(animate);
            };

            animateStep();
        };

        if (pathCoordinates.length > 0) {
            setBusLocation({
                busId: "BUS-1",
                latitude: pathCoordinates[0].lat,
                longitude: pathCoordinates[0].lng,
                locationName: pathCoordinates[0].name,
                isMoving: false,
            });

            setTimeout(() => {
                startMoving();
            }, pathCoordinates[0].stopDuration);
        }

        return () => {
            if (animationFrameId.current !== null) cancelAnimationFrame(animationFrameId.current);
        };
    }, [isLoaded]);

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

            {isLoaded ? (
                <GoogleMap
                    mapContainerClassName={styles.mapContainer}
                    center={busLocation ? { lat: busLocation.latitude, lng: busLocation.longitude } : center}
                    zoom={14}
                >
                    {busLocation && (
                        <Marker
                            position={{ lat: busLocation.latitude, lng: busLocation.longitude }}
                            icon={{
                                url: busIcon,
                                scaledSize: new window.google.maps.Size(40, 40),
                                anchor: new window.google.maps.Point(20, 20),
                            }}
                        />
                    )}
                    {pathCoordinates.map((stop, index) => (
                        <Marker
                            key={index}
                            position={{ lat: stop.lat, lng: stop.lng }}
                            label={{
                                text: stop.name,
                                color: "#1f2937",
                                fontWeight: "bold",
                                fontSize: "12px",
                            }}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: "#6366f1",
                                fillOpacity: 0.9,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                            }}
                        />
                    ))}
                </GoogleMap>
            ) : (
                <p>Loading map...</p>
            )}
        </div>
    );
};

export default BusMap;