import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl glass-dark border border-white/5 hover:border-cyan-500/30 
                 transition-all duration-300 group relative overflow-hidden flex items-center justify-center"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative z-10">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-cyan-600 group-hover:-rotate-12 transition-transform duration-500" />
        )}
      </div>
      
      {/* Decorative background glow */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
                      ${theme === 'dark' ? 'bg-amber-400/10' : 'bg-cyan-500/10'}`} />
    </button>
  )
}
