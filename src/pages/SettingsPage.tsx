import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase/client'
import { getNotificationsEnabled, setNotificationsEnabled } from '../hooks/useTaskNotifications'
import { UserCircle, Mail, Lock, Bell, CheckCircle2, AlertCircle, Loader2, Save, ShieldCheck, Activity } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [notificationsOn, setNotificationsOn] = useState(getNotificationsEnabled())
  const [showGraph, setShowGraph] = useState(() => localStorage.getItem('wavelength.showGraph') !== 'false')

  useEffect(() => {
    if (!user) return
    setEmail(user.email || '')
    setName((user.user_metadata?.name as string) || '')
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim()

      const { error: authError } = await supabase.auth.updateUser({
        data: { name: trimmedName },
        ...(trimmedEmail !== user.email ? { email: trimmedEmail } : {})
      })
      if (authError) throw authError

      const { error: dbError } = await supabase
        .from('users')
        .update({ name: trimmedName, email: trimmedEmail })
        .eq('id', user.id)
      if (dbError) throw dbError

      const emailChanged = trimmedEmail !== user.email
      setProfileMessage({
        type: 'success',
        text: emailChanged
          ? 'Profile saved. Check your inbox to confirm the new email address.'
          : 'Profile updated successfully.'
      })
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err?.message || 'Failed to update profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' })
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err?.message || 'Failed to change password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const toggleNotifications = () => {
    const next = !notificationsOn
    setNotificationsOn(next)
    setNotificationsEnabled(next)
  }

  const toggleGraph = () => {
    const next = !showGraph
    setShowGraph(next)
    localStorage.setItem('wavelength.showGraph', String(next))
    window.dispatchEvent(new Event('wavelength-graph-toggled'))
  }

  const alertBox = (message: { type: 'success' | 'error'; text: string } | null) => {
    if (!message) return null
    const isSuccess = message.type === 'success'
    return (
      <div className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs animate-fadeIn ${
        isSuccess
          ? 'bg-secondary/15 border-secondary/30 text-secondary'
          : 'bg-error/10 border-error/25 text-error'
      }`}>
        {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
        <span>{message.text}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full pb-10 pt-4 space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            System Preferences
          </span>
          <span className="text-xs text-outline">• Account & Security</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-white font-display mt-1">
          Settings
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Manage your account profile, security credentials, and telemetry preferences.
        </p>
      </section>

      {/* Grid of Sections */}
      <div className="space-y-6">
        
        {/* Profile Information */}
        <section className="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-white">Profile Information</h2>
                <p className="text-xs text-on-surface-variant">Update your public identity and notification email</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-surface-container text-outline text-[11px] font-semibold">
              Active Member
            </span>
          </div>

          {alertBox(profileMessage)}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-surface-container-lowest font-headline-sm text-xs font-bold rounded-full transition-all duration-150 hover:bg-slate-100 hover:scale-[0.99] active:scale-[0.98] shadow-md disabled:opacity-50"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-white">Security & Credentials</h2>
                <p className="text-xs text-on-surface-variant">Update password to keep your pipeline secure</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              256-bit Encrypted
            </span>
          </div>

          {alertBox(passwordMessage)}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none rounded-xl text-xs text-white placeholder-outline transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-surface-container-high hover:bg-surface-container text-white font-headline-sm text-xs font-semibold rounded-full transition-all duration-150 disabled:opacity-50"
              >
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </section>

        {/* Application Preferences */}
        <section className="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-container">
            <div className="w-10 h-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-white">Workspace Preferences</h2>
              <p className="text-xs text-on-surface-variant">Configure desktop alerts and telemetry visualizations</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Desktop notifications toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <p className="font-headline-sm text-xs font-semibold text-white">Desktop Task Notifications</p>
                </div>
                <p className="text-xs text-on-surface-variant">Alert me about due and overdue client commitments while app is active.</p>
                {!window.electronAPI?.notify && (
                  <p className="text-[11px] text-primary/80 pt-1">Native alerts enabled via system notification bridge.</p>
                )}
              </div>
              <button
                type="button"
                onClick={toggleNotifications}
                role="switch"
                aria-checked={notificationsOn}
                aria-label="Toggle desktop task notifications"
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  notificationsOn ? 'bg-secondary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-md ${
                    notificationsOn ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show Call Activity Graph toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-secondary" />
                  <p className="font-headline-sm text-xs font-semibold text-white">Show Call Activity Telemetry</p>
                </div>
                <p className="text-xs text-on-surface-variant">Display real-time synthesis frequency chart on overview dashboard.</p>
              </div>
              <button
                type="button"
                onClick={toggleGraph}
                role="switch"
                aria-checked={showGraph}
                aria-label="Toggle Call Activity Graph"
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                  showGraph ? 'bg-secondary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-md ${
                    showGraph ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
