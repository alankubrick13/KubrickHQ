import { useState, useEffect } from 'react'
import Library from './components/Library'
import Reader from './components/Reader'
import Settings from './components/Settings'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'

function AppContent() {
    const [view, setView] = useState('library') // 'library' | 'reader' | 'settings'
    const [currentBookId, setCurrentBookId] = useState(null)
    const { imageSettings } = useSettings()

    const openBook = (id) => {
        setCurrentBookId(id)
        setView('reader')
    }

    const goHome = () => {
        setView('library')
        setCurrentBookId(null)
    }

    // Prevent default browser behavior for drag and drop globally
    useEffect(() => {
        const handleDragOver = (e) => e.preventDefault();
        const handleDrop = (e) => e.preventDefault();
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);
        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        }
    }, []);

    // Dynamic Sharpen Filter Calculation
    // We interpolate between Identity [0 0 0, 0 1 0, 0 0 0] and Sharpen [0 -s 0, -s 4s+1 -s, 0 -s 0] based on slider 0-100.
    const s = (imageSettings.sharpen || 0) / 100; // 0 to 1
    const center = 4 * s + 1;
    const side = -s;
    const kernelMatrix = `0 ${side} 0 ${side} ${center} ${side} 0 ${side} 0`;

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white transition-colors duration-300 relative">
            {/* Global SVG Filters */}
            <svg className="hidden">
                <defs>
                    <filter id="sharpen">
                        <feConvolveMatrix
                            order="3"
                            preserveAlpha="true"
                            kernelMatrix={kernelMatrix}
                        />
                    </filter>
                </defs>
            </svg>

            {/* Blue Light Filter Overlay (Fixed Opacity 30%) */}
            {imageSettings.blueLight === true && (
                <div
                    className="absolute inset-0 z-[9999] pointer-events-none mix-blend-multiply dark:mix-blend-overlay transition-opacity duration-300"
                    style={{ backgroundColor: 'rgba(255, 147, 41, 0.4)' }}
                ></div>
            )}

            {/* App Bar / Drag Region */}
            <div className={`h-8 w-full drag flex items-center px-4 select-none border-b justify-between transition-colors duration-300 ${view === 'reader' ? 'bg-white dark:bg-[#121212] border-gray-200 dark:border-gray-800' : 'bg-white/95 dark:bg-[#121212]/95 backdrop-blur border-gray-200 dark:border-white/5'}`}>
                <span className="text-xs font-bold tracking-widest uppercase opacity-70">KubrickHQ</span>
                <div className="no-drag flex gap-2"></div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {view === 'library' && <Library onOpen={openBook} onOpenSettings={() => setView('settings')} />}
                {view === 'reader' && <Reader comicId={currentBookId} onBack={goHome} />}
                {view === 'settings' && <Settings onBack={goHome} />}
            </div>
        </div>
    )
}

function App() {
    return (
        <SettingsProvider>
            <AppContent />
        </SettingsProvider>
    )
}

export default App
