import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';

const BOOT_STEPS = [
    'Initializing HomeCore Nexus',
    'Connecting to Backend',
    'Checking MQTT Bridge',
    'Syncing Modules',
    'System Ready',
];

export function LoadingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev < BOOT_STEPS.length - 1) return prev + 1;
                clearInterval(stepInterval);
                return prev;
            });
        }, 420);

        const timeout = setTimeout(() => setTimedOut(true), 5000);

        return () => {
            clearInterval(stepInterval);
            clearTimeout(timeout);
        };
    }, []);

    const progress = ((currentStep + 1) / BOOT_STEPS.length) * 100;

    return (
        <div className="loading-screen">
            <div className="loading-logo-container">
                <div className="loading-ring" />
                <div className="loading-ring" />
                <div className="loading-ring" />
                <div className="loading-logo">
                    <Server size={28} />
                </div>
            </div>

            <div className="loading-text">
                <div className="loading-title">HomeCore Nexus</div>
                <div className="loading-subtitle">Modular IoT Command Center</div>
            </div>

            <div className="loading-steps">
                {BOOT_STEPS.map((step, index) => (
                    <div
                        key={step}
                        className={`loading-step ${
                            index < currentStep ? 'done' : index === currentStep ? 'active' : ''
                        }`}
                    >
                        <span className="loading-step-dot" />
                        <span>{step}</span>
                    </div>
                ))}
            </div>

            <div className="loading-progress">
                <div className="loading-progress-bar" style={{ width: `${progress}%` }} />
            </div>

            {timedOut && (
                <div className="nexus-inset" style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, zIndex: 1, padding: '10px 14px' }}>
                    Boot sequence is taking longer than expected. If this persists, check backend availability.
                </div>
            )}
        </div>
    );
}
