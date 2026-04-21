import { Link } from 'react-router-dom'
import { Shield, Radio, Activity, Menu, Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'

export default function Header({ status, connected }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="glass-dark rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl border border-white/5">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:bg-cyan-500/30 transition-all">
            <Shield className="text-cyan-400" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">
              AbhayDrishti <span className="text-cyan-400">C2</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono hidden md:block">
              MISSION CONTROL // STATE_COMMAND
            </p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1 ml-4 border-l border-white/10 pl-4">
          <Link to="/" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            STATE MAP
          </Link>
          <Link to="/analytics/SOM" className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            ANALYTICS
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-cyan-400 transition-all"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="flex items-center gap-4 px-3 py-1.5 glass-darker rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-mono text-slate-300">
              {connected ? 'SOCKET_ESTABLISHED' : 'CONNECTION_LOST'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-4">
            <div className="flex items-center gap-1.5">
              <Activity className="text-cyan-500" size={12} />
              <span className="text-[10px] font-mono text-slate-400">ENGINE:</span>
              <span className="text-[10px] font-mono text-cyan-400">{status?.model_ready ? 'OPERATIONAL' : 'CALIBRATING'}</span>
            </div>
          </div>
        </div>

        <button className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
          <Menu size={20} />
        </button>
      </div>
    </header>
  )
}
