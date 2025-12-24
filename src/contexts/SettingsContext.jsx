import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from './i18n'

const SettingsContext = createContext()

export const useSettings = () => useContext(SettingsContext)

export const SettingsProvider = ({ children }) => {
    // Load persisted settings
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system')
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'pt-br')

    const [defaultViewMode, setDefaultViewMode] = useState(localStorage.getItem('defaultViewMode') || 'single')

    // Default Image Settings
    const defaultImageSettings = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sharpen: 0,
        denoise: 0,
        blueLight: false
    }

    const [imageSettings, setImageSettings] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('imageSettings'))
            return { ...defaultImageSettings, ...saved }
        } catch {
            return defaultImageSettings
        }
    })

    // Persist changes
    useEffect(() => { localStorage.setItem('theme', theme) }, [theme])
    useEffect(() => { localStorage.setItem('language', language) }, [language])
    useEffect(() => { localStorage.setItem('defaultViewMode', defaultViewMode) }, [defaultViewMode])
    useEffect(() => { localStorage.setItem('imageSettings', JSON.stringify(imageSettings)) }, [imageSettings])

    const t = translations[language]

    // Apply Theme
    useEffect(() => {
        const root = document.documentElement
        const applyDark = () => root.classList.add('dark')
        const applyLight = () => root.classList.remove('dark')

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = (e) => e.matches ? applyDark() : applyLight()

            if (mediaQuery.matches) applyDark()
            else applyLight()

            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        } else if (theme === 'dark') {
            applyDark()
        } else {
            applyLight()
        }
    }, [theme])

    const resetImageSettings = () => setImageSettings({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sharpen: 0,
        denoise: 0,
        blueLight: false
    })

    return (
        <SettingsContext.Provider value={{
            theme, setTheme,
            language, setLanguage,
            defaultViewMode, setDefaultViewMode,
            imageSettings, setImageSettings,
            resetImageSettings,
            t
        }}>
            {children}
        </SettingsContext.Provider>
    )
}
