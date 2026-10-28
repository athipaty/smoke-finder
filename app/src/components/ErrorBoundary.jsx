import { Component } from 'react'
import { translate } from '../i18n/index.jsx'
import { isStaleBuild, reloadForNewVersion, reportError } from '../errors.js'

// A screen that crashes shows this instead of a blank page, and the error is
// reported. An old version that can't load a screen reloads itself instead.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    if (isStaleBuild(error) && reloadForNewVersion()) return
    reportError(error, info?.componentStack?.trim().split('\n').slice(0, 6).join('\n'))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center" role="alert">
        <h1 className="text-xl font-bold">{translate('crash.title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">{translate('crash.body')}</p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 rounded-xl bg-go px-6 py-3 font-semibold text-white dark:bg-go-dark dark:text-stone-950"
        >
          {translate('crash.reload')}
        </button>
      </main>
    )
  }
}
