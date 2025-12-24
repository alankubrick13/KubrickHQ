import { ArrowLeft, Monitor, Moon, Sun, Globe, Image as ImageIcon, RotateCcw, BookOpen } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'

const Settings = ({ onBack }) => {
    const { theme, setTheme, language, setLanguage, defaultViewMode, setDefaultViewMode, imageSettings, setImageSettings, resetImageSettings, t } = useSettings()

    const updateImage = (key, value) => {
        setImageSettings(prev => ({ ...prev, [key]: value })) // Value might be bool or int
    }

    return (
        <div className="h-full bg-gray-50 dark:bg-[#121212] flex flex-col transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 px-8 py-6 sticky top-0 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5 z-10">
                <button onClick={onBack} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition text-gray-900 dark:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t.settings}</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-8">

                {/* Theme Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Monitor size={20} className="text-primary" />
                        {t.theme}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                            <Sun size={24} />
                            <span className="font-medium">{t.light}</span>
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                            <Moon size={24} />
                            <span className="font-medium">{t.dark}</span>
                        </button>
                        <button
                            onClick={() => setTheme('system')}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                            <Monitor size={24} />
                            <span className="font-medium">{t.system}</span>
                        </button>
                    </div>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Language Section */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Globe size={20} className="text-primary" />
                        {t.language}
                    </h2>
                    <div className="flex gap-4">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="pt-br">Português (Brasil)</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Reading Config */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <BookOpen size={20} className="text-primary" />
                        Reading Preferences
                    </h2>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default View Mode</label>
                            <select
                                value={defaultViewMode}
                                onChange={(e) => setDefaultViewMode(e.target.value)}
                                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="single">{t.reader?.single || 'Single Page'}</option>
                                <option value="double">{t.reader?.double || 'Double Page'}</option>
                                <option value="vertical">{t.reader?.vertical || 'Vertical Scroll'}</option>
                            </select>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Image Settings Section */}
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <ImageIcon size={20} className="text-primary" />
                            {t.imageAdjustments}
                        </h2>
                        <button
                            onClick={resetImageSettings}
                            className="text-sm flex items-center gap-1.5 text-gray-500 hover:text-primary transition-colors"
                        >
                            <RotateCcw size={14} />
                            {t.reset}
                        </button>
                    </div>

                    <div className="space-y-6 bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        {/* Brightness */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.brightness}</label>
                                <span className="text-sm text-gray-500">{imageSettings.brightness}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="150"
                                value={imageSettings.brightness}
                                onChange={(e) => updateImage('brightness', parseInt(e.target.value))}
                                className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Contrast */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.contrast}</label>
                                <span className="text-sm text-gray-500">{imageSettings.contrast}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="150"
                                value={imageSettings.contrast}
                                onChange={(e) => updateImage('contrast', parseInt(e.target.value))}
                                className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Saturation */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.saturation}</label>
                                <span className="text-sm text-gray-500">{imageSettings.saturation}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={imageSettings.saturation}
                                onChange={(e) => updateImage('saturation', parseInt(e.target.value))}
                                className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Blue Light Filter (Checkbox) */}
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-[#121212] p-4 rounded-lg">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.blueLightFilter}</label>
                                <span className="text-xs text-gray-500">Reduces eye strain</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={imageSettings.blueLight === true}
                                onChange={(e) => updateImage('blueLight', e.target.checked)}
                                className="w-5 h-5 accent-orange-500 cursor-pointer rounded"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Sharpen (Slider) */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.sharpen}</label>
                                    <span className="text-sm text-gray-500">{imageSettings.sharpen || 0}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={imageSettings.sharpen || 0}
                                    onChange={(e) => updateImage('sharpen', parseInt(e.target.value))}
                                    className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Denoise (Slider) */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.denoise}</label>
                                    <span className="text-sm text-gray-500">{imageSettings.denoise || 0}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={imageSettings.denoise || 0}
                                    onChange={(e) => updateImage('denoise', parseInt(e.target.value))}
                                    className="w-full accent-primary h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                    </div>
                </section>
            </div>
        </div>
    )
}

export default Settings
