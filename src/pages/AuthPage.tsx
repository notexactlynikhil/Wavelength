import React, { useState } from 'react'
import { supabase } from '../supabase/client'
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { LambdaLogo } from '../components/LambdaLogo'

export const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [staySignedIn, setStaySignedIn] = useState(() => localStorage.getItem('wavelength.staySignedIn') !== 'false')

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.')
      return false
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return false
    }
    if (isSignUp && !name.trim()) {
      setErrorMessage('Please enter your name.')
      return false
    }
    return true
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)

    if (!validateForm()) return

    setLoading(true)

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session === null) {
          setInfoMessage('Registration successful! Please check your email inbox to confirm your account.')
        } else {
          setInfoMessage('Registration successful! Welcome to Wavelength.')
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('Incorrect email or password. Please try again.')
      } else if (msg.includes('User already registered')) {
        setErrorMessage('An account with this email address already exists.')
      } else if (msg.includes('Network connection lost') || msg.includes('Failed to fetch')) {
        setErrorMessage('Network error. Unable to reach authentication server.')
      } else {
        setErrorMessage('Authentication failed. Please verify your details and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-container-lowest text-on-surface relative overflow-hidden select-none p-4">
      {/* Ambient background glow matching Stitch design */}
      <div className="wavelength-bg-blobs">
        <div className="absolute top-[-80px] left-[15%] w-[420px] h-[340px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-[-50px] right-[20%] w-[380px] h-[300px] rounded-full bg-secondary/10 blur-[140px] pointer-events-none" />
      </div>

      {/* Main Glass Card */}
      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-2xl relative z-10 animate-slideUp backdrop-blur-md">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-primary/15 text-primary rounded-2xl mb-4 border border-primary/20 shadow-[0_0_24px_rgba(208,188,255,0.25)]">
            <LambdaLogo className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center mb-1">
            <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-white font-display">
              Wavelength
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isSignUp ? 'Create an account to activate your intelligence pipeline' : 'Autonomous sales intelligence & deal telemetry'}
          </p>
        </div>

        {/* Tab switch between Sign In and Sign Up */}
        <div className="flex p-1 mb-6 rounded-full bg-surface-container-lowest border border-outline-variant/50">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMessage(null); setInfoMessage(null) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              !isSignUp
                ? 'bg-white text-surface-container-lowest shadow-md font-bold'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMessage(null); setInfoMessage(null) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              isSignUp
                ? 'bg-white text-surface-container-lowest shadow-md font-bold'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/25 text-error text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-secondary/15 border border-secondary/30 text-secondary text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Name Field (Sign Up Only) */}
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-on-surface-variant tracking-wider uppercase">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Sarah Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant tracking-wider uppercase">Work Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="sarah@wavelength.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-on-surface-variant tracking-wider uppercase">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-outline hover:text-primary transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="staySignedIn"
                checked={staySignedIn}
                onChange={(e) => {
                  setStaySignedIn(e.target.checked)
                  localStorage.setItem('wavelength.staySignedIn', String(e.target.checked))
                }}
                className="w-4 h-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary/30"
              />
              <span className="text-xs text-on-surface-variant">Stay signed in</span>
            </label>
            {!isSignUp && (
              <span className="text-[11px] text-outline hover:text-primary cursor-pointer transition">
                Forgot password?
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-3 bg-white hover:bg-slate-100 text-surface-container-lowest font-headline-sm text-sm font-bold rounded-full transition-all duration-150 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.18)] hover:scale-[0.99] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="border-2 border-surface-container-lowest border-t-transparent w-4 h-4 rounded-full animate-spin" />
            ) : (
              isSignUp ? 'Create Wavelength Account' : 'Sign In to Workspace'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-outline-variant/40 text-center text-[11px] text-outline">
          <span>Protected by Enterprise TLS 1.3 & AES-256 Vault Encryption</span>
        </div>
      </div>
    </div>
  )
}
