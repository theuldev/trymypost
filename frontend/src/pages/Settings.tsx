import { useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Input, Switch, Label, FileInput } from '@/components/ui'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useUIStore } from '@/store'
import { 
  Sun, Moon, Bell, Shield, Key, Database, 
  Download, Upload, Trash2, Info, AlertTriangle,
  CheckCircle, XCircle, Loader2, Palette, Layout,
  Eye, ExternalLink, BookOpen, Code2, Settings as SettingsIcon
} from 'lucide-react'

function SettingsPage() {
  const { darkMode, toggleDarkMode, addToast } = useUIStore()
  const [notifications, setNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [compactMode, setCompactMode] = useState(false)
  const [language, setLanguage] = useState('pt-BR')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const handleExportData = () => {
    const data = {
      presets: localStorage.getItem('code_image_presets'),
      draft: localStorage.getItem('playground_draft'),
      ui: {
        darkMode,
        sidebarOpen: true,
      },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trymypost-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', message: 'Dados exportados com sucesso!' })
  }

  const handleImportData = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.presets) localStorage.setItem('code_image_presets', data.presets)
        if (data.draft) localStorage.setItem('playground_draft', data.draft)
        if (data.ui?.darkMode !== undefined) toggleDarkMode()
        addToast({ type: 'success', message: 'Dados importados!' })
      } catch {
        addToast({ type: 'error', message: 'Arquivo inválido' })
      }
    }
    reader.readAsText(file)
  }

  const handleClearAllData = () => {
    if (confirm('Tem certeza? Isso apagará todos os presets, rascunhos e preferências.')) {
      localStorage.removeItem('code_image_presets')
      localStorage.removeItem('playground_draft')
      localStorage.removeItem('ui-store')
      localStorage.removeItem('history-store')
      addToast({ type: 'success', message: 'Todos os dados locais foram limpos' })
      window.location.reload()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Configurações</h1>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Personalize sua experiência</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary-500" />
              Aparência
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  {darkMode ? <Moon className="h-4 w-4 text-yellow-600" /> : <Sun className="h-4 w-4 text-yellow-600" />}
                </div>
                <div>
                  <label className="font-medium text-surface-900 dark:text-surface-50">Modo Escuro</label>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Alterna entre tema claro e escuro</p>
                </div>
              </div>
              <Switch checked={darkMode} onChange={toggleDarkMode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Layout className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <label className="font-medium text-surface-900 dark:text-surface-50">Modo Compacto</label>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Reduz espaçamentos para mais conteúdo</p>
                </div>
              </div>
              <Switch checked={compactMode} onChange={setCompactMode} />
            </div>

            <Label>Idioma</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full max-w-xs px-3 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-150"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-500" />
              Comportamento
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <label className="font-medium text-surface-900 dark:text-surface-50">Salvamento Automático</label>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Salva rascunhos automaticamente</p>
                </div>
              </div>
              <Switch checked={autoSave} onChange={setAutoSave} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <label className="font-medium text-surface-900 dark:text-surface-50">Notificações</label>
                  <p className="text-xs text-surface-500 dark:text-surface-400">Mostra toasts para ações concluídas</p>
                </div>
              </div>
              <Switch checked={notifications} onChange={setNotifications} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Key className="h-5 w-5 text-primary-500" />
              Chaves de API
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Google Gemini API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="Insira sua chave da API do Google Gemini"
                  className="flex-1"
                />
                <Button variant="ghost" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                Obtenha sua chave em <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Google AI Studio</a>
              </p>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium">Chaves necessárias</p>
                  <p className="mt-1">Para usar o gerador de posts, configure as variáveis de ambiente no backend:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">GOOGLE_API_KEY</code></li>
                    <li><code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">TAVILY_API_KEY</code></li>
                    <li><code className="bg-surface-100 dark:bg-surface-800 px-1 rounded">JWT_SECRET</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary-500" />
              Dados Locais
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={handleExportData}>
                Exportar Dados
              </Button>
              <FileInput
                label="Importar Dados"
                accept=".json"
                onChange={handleImportData}
                hint="Arquivo JSON exportado"
              />
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <p className="font-medium">Zona de Perigo</p>
                    <p className="mt-1">Esta ação remove todos os presets salvos, rascunhos e preferências locais. Não afeta o banco de dados do servidor.</p>
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={handleClearAllData} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
                  Limpar Tudo
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary-500" />
              Sobre
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-surface-900 dark:text-surface-50">Versão</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">1.0.0</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-surface-900 dark:text-surface-50">Stack</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">React 18 + TypeScript + Tailwind + FastAPI</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-surface-900 dark:text-surface-50">Backend</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">Python + FastAPI + LangChain + Gemini</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-surface-900 dark:text-surface-50">Banco de Dados</span>
                </div>
                <p className="text-sm text-surface-600 dark:text-surface-400">SQLite (desenvolvimento) / PostgreSQL (produção)</p>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
              <h3 className="font-medium text-surface-900 dark:text-surface-50 mb-2">Links Úteis</h3>
              <div className="flex flex-wrap gap-3">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" /> GitHub
                </a>
                <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> FastAPI Docs
                </a>
                <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5" /> React Docs
                </a>
                <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5" /> Tailwind Docs
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
  
export default SettingsPage