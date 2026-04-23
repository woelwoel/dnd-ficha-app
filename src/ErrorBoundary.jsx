import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('UI error capturado por ErrorBoundary:', error, info)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-950 text-gray-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-900/60 rounded-xl p-6 text-center">
          <h2 className="text-xl text-amber-400 font-display mb-2">Algo deu errado.</h2>
          <p className="text-sm text-gray-400 mb-5">
            Um erro inesperado interrompeu a tela. Suas fichas estão salvas.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-[10px] text-red-400 bg-gray-950 border border-gray-800 rounded p-2 mb-4 overflow-auto text-left">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
            >
              Tentar novamente
            </button>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    )
  }
}
