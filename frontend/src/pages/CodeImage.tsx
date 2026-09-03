import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Download, Copy, ChevronDown, Sun, Monitor, Smartphone, 
  Code2, Palette, Type, Minimize2, Maximize2, X, 
  Check, Hash, RotateCw, Save, Trash2, Eye, Loader2,
  Image as ImageIcon, Settings, Layers, Sparkles
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button, IconButton } from '@/components/ui'
import { Input, Textarea, Select, Switch, Label } from '@/components/ui'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { codeApi } from '@/services/posts'
import { useUIStore } from '@/store'
import html2canvas from 'html2canvas'
import Prism from 'prismjs'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'csharp', label: 'C#' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Shell/Bash' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'json', label: 'JSON' },
  { value: 'plaintext', label: 'Texto Plano' },
]

const THEMES = [
  { value: 'sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, #ff5f6d, #ffc371)' },
  { value: 'oceanic', label: 'Oceanic', gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
  { value: 'neon', label: 'Neon', gradient: 'linear-gradient(135deg, #ec008c, #fc6767)' },
  { value: 'midnight', label: 'Midnight', gradient: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { value: 'emerald', label: 'Emerald', gradient: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { value: 'aurora', label: 'Aurora', gradient: 'linear-gradient(135deg, #7F00FF, #E100FF)' },
  { value: 'cyberpunk', label: 'Cyberpunk', gradient: 'linear-gradient(135deg, #F1F2B5, #135058)' },
  { value: 'cosmic', label: 'Cosmic', gradient: 'linear-gradient(135deg, #8A2387, #E94057, #F27121)' },
  { value: 'vscode-dark', label: 'VS Code Dark', gradient: 'linear-gradient(135deg, #1a1a2e, #252526, #1e1e2e)' },
  { value: 'vscode-light', label: 'VS Code Light', gradient: 'linear-gradient(135deg, #f3f3f3, #ffffff)' },
  { value: 'vs2022-blue', label: 'VS 2022 Blue', gradient: 'linear-gradient(135deg, #1b3a5c, #2d5a87, #1e3a5f)' },
  { value: 'vs2022-dark', label: 'VS 2022 Dark', gradient: 'linear-gradient(135deg, #2d2d30, #3e3e42, #252526)' },
  { value: 'github-dark', label: 'GitHub Dark', gradient: 'linear-gradient(135deg, #0d1117, #161b22, #21262d)' },
  { value: 'dracula', label: 'Dracula', gradient: 'linear-gradient(135deg, #282a36, #44475a, #6272a4)' },
  { value: 'one-dark', label: 'One Dark', gradient: 'linear-gradient(135deg, #282c34, #3b4048, #21252b)' },
  { value: 'nord', label: 'Nord', gradient: 'linear-gradient(135deg, #2e3440, #3b4252, #434c5e)' },
  { value: 'monokai', label: 'Monokai', gradient: 'linear-gradient(135deg, #272822, #3e3d32, #49483e)' },
  { value: 'gruvbox', label: 'Gruvbox', gradient: 'linear-gradient(135deg, #282828, #3c3836, #504945)' },
  { value: 'catppuccin', label: 'Catppuccin', gradient: 'linear-gradient(135deg, #1e1e2e, #313244, #45475a)' },
  { value: 'synthwave', label: 'Synthwave', gradient: 'linear-gradient(135deg, #5f0a87, #a4508b, #ff6bcb)' },
  { value: 'dark', label: 'Cinza Escuro', gradient: 'linear-gradient(135deg, #27272a, #09090b)' },
  { value: 'transparent', label: 'Transparente', gradient: 'transparent' },
]

const FONT_FAMILIES = [
  { value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace", label: 'Cascadia Code (VS 2022)' },
  { value: "'Consolas', 'Courier New', monospace", label: 'Consolas (VS Classic)' },
  { value: "'Fira Code', 'Courier New', monospace", label: 'Fira Code' },
  { value: "'JetBrains Mono', 'Courier New', monospace", label: 'JetBrains Mono' },
  { value: "'Source Code Pro', 'Courier New', monospace", label: 'Source Code Pro' },
  { value: "'IBM Plex Mono', 'Courier New', monospace", label: 'IBM Plex Mono' },
]

const FONT_SIZES = [
  { value: '12px', label: 'Pequeno' },
  { value: '14px', label: 'Médio' },
  { value: '16px', label: 'Grande' },
  { value: '18px', label: 'Extra' },
]

const PADDINGS = [
  { value: '16px', label: 'Pequeno' },
  { value: '32px', label: 'Médio' },
  { value: '48px', label: 'Grande' },
  { value: '64px', label: 'Extra' },
]

const WINDOW_STYLES = [
  { value: 'mac', label: 'macOS' },
  { value: 'simple', label: 'Simples' },
  { value: 'none', label: 'Sem barra' },
]

const DEFAULT_FILENAMES: Record<string, string> = {
  javascript: 'index.js',
  typescript: 'index.ts',
  csharp: 'Program.cs',
  python: 'script.py',
  html: 'index.html',
  css: 'styles.css',
  sql: 'query.sql',
  bash: 'script.sh',
  java: 'Main.java',
  go: 'main.go',
  rust: 'main.rs',
  json: 'data.json',
  plaintext: 'arquivo.txt',
}

const VS2022_PRESET = {
  theme: 'vs2022-dark',
  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  fontSize: '14px',
  padding: '32px',
  windowStyle: 'mac',
  lineNumbers: false,
}

const PRESETS = [
  { name: 'VS 2022 Dark', ...VS2022_PRESET },
  { name: 'VS 2022 Blue', ...VS2022_PRESET, theme: 'vs2022-blue' },
  { name: 'VS Code Dark', ...VS2022_PRESET, theme: 'vscode-dark' },
  { name: 'Dracula', ...VS2022_PRESET, theme: 'dracula', fontFamily: "'Fira Code', 'Courier New', monospace" },
  { name: 'GitHub Dark', ...VS2022_PRESET, theme: 'github-dark', fontFamily: "'Fira Code', 'Courier New', monospace" },
  { name: 'Synthwave', ...VS2022_PRESET, theme: 'synthwave', fontFamily: "'JetBrains Mono', 'Courier New', monospace" },
  { name: 'Sunset', ...VS2022_PRESET, theme: 'sunset', fontFamily: "'Fira Code', 'Courier New', monospace" },
]

const STORAGE_KEY = 'code_image_presets'

function getPresets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return PRESETS
}

function savePresets(presets: any[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {}
}

function applyPreset(preset: any, setters: any) {
  setters.setTheme(preset.theme)
  setters.setFontFamily(preset.fontFamily)
  setters.setFontSize(preset.fontSize)
  setters.setPadding(preset.padding)
  setters.setWindowStyle(preset.windowStyle)
  setters.setLineNumbers(preset.lineNumbers)
  setters.setTitle(DEFAULT_FILENAMES[preset.theme.includes('cs') ? 'csharp' : 'javascript'] || 'index.js')
}

export function CodeImage() {
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [title, setTitle] = useState(DEFAULT_FILENAMES.javascript)
  const [theme, setTheme] = useState('sunset')
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[2].value)
  const [fontSize, setFontSize] = useState('14px')
  const [padding, setPadding] = useState('32px')
  const [windowStyle, setWindowStyle] = useState('mac')
  const [lineNumbers, setLineNumbers] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'generate'>('editor')
  const [postText, setPostText] = useState('')
  const [presets, setPresets] = useState(() => getPresets())
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  const previewRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const generateCodeMutation = useMutation({
    mutationFn: codeApi.fromPost,
    onSuccess: (data) => {
      setCode(data.code)
      setLanguage(data.language)
      setTitle(data.title)
      setActiveTab('editor')
      addToast({ type: 'success', message: 'Código gerado a partir do post!' })
    },
    onError: () => addToast({ type: 'error', message: 'Erro ao gerar código' }),
  })

  // Auto-update filename when language changes
  useEffect(() => {
    const autoDefaults = Object.values(DEFAULT_FILENAMES)
    if (autoDefaults.includes(title) || !title) {
      setTitle(DEFAULT_FILENAMES[language] || 'index.js')
    }
  }, [language])

  // Load code from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    const langParam = params.get('lang')
    if (codeParam) setCode(decodeURIComponent(codeParam))
    if (langParam && LANGUAGES.some(l => l.value === langParam)) setLanguage(langParam)
  }, [])

  // Highlight code
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.className = `language-${language}`
      Prism.highlightElement(codeRef.current)
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.style.fontSize = fontSize
    }
  }, [code, language, fontSize])

  // Update line numbers
  useEffect(() => {
    if (!showLineNumbers || !code) {
      setShowLineNumbers(false)
      return
    }
    const lines = code.split('\n').length
    let nums = ''
    for (let i = 1; i <= lines; i++) nums += `${i}\n`
    if (lineNumbersRef.current) {
      lineNumbersRef.current.textContent = nums
      lineNumbersRef.current.style.display = 'block'
    }
    setShowLineNumbers(true)
  }, [code, showLineNumbers, fontSize])

  const setters = {
    setTheme, setFontFamily, setFontSize, setPadding, setWindowStyle, setLineNumbers, setTitle,
  }

  const currentConfig = {
    theme, fontFamily, fontSize, padding, windowStyle, lineNumbers,
  }

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return
    const newPreset = { name: newPresetName.trim(), ...currentConfig }
    const updated = [...presets, newPreset]
    setPresets(updated)
    savePresets(updated)
    setShowSavePreset(false)
    setNewPresetName('')
    addToast({ type: 'success', message: `Preset "${newPresetName}" salvo!` })
  }

  const handleApplyPreset = (preset: any) => {
    applyPreset(preset, setters)
    addToast({ type: 'success', message: `Preset "${preset.name}" aplicado!` })
  }

  const handleDeletePreset = (index: number) => {
    const updated = presets.filter((_, i) => i !== index)
    setPresets(updated)
    savePresets(updated)
    addToast({ type: 'success', message: 'Preset removido' })
  }

  const handleDownload = async () => {
    if (!previewRef.current) return
    setIsRendering(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: theme === 'transparent' ? null : undefined,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `${title.replace(/\.[^.]+$/, '')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      addToast({ type: 'success', message: 'Imagem baixada!' })
    } catch (e) {
      addToast({ type: 'error', message: 'Erro ao gerar imagem' })
    } finally {
      setIsRendering(false)
    }
  }

  const handleCopy = async () => {
    if (!previewRef.current) return
    setIsRendering(true)
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: theme === 'transparent' ? null : undefined,
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          addToast({ type: 'success', message: 'Imagem copiada!' })
        }
      }, 'image/png')
    } catch (e) {
      addToast({ type: 'error', message: 'Erro ao copiar imagem' })
    } finally {
      setIsRendering(false)
    }
  }

  const themeObj = THEMES.find(t => t.value === theme)
  const windowStyleObj = WINDOW_STYLES.find(w => w.value === windowStyle)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <div className="w-full lg:w-96 border-r border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Imagem de Código</h1>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Gere imagens bonitas do seu código</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Tab Selector */}
          <div className="flex gap-2">
            <Button variant={activeTab === 'editor' ? 'primary' : 'ghost'} fullWidth onClick={() => setActiveTab('editor')} leftIcon={<Code2 className="h-4 w-4" />}>
              Código Pronto
            </Button>
            <Button variant={activeTab === 'generate' ? 'primary' : 'ghost'} fullWidth onClick={() => setActiveTab('generate')} leftIcon={<Sparkles className="h-4 w-4" />}>
              Gerar a partir de Post
            </Button>
          </div>

          {activeTab === 'editor' && (
            <>
              <Textarea
                label="Código"
                value={code}
                onChange={setCode}
                placeholder="Cole seu código aqui..."
                rows={10}
                className="font-mono text-sm"
              />

              <Select
                label="Linguagem"
                value={language}
                onChange={setLanguage}
                options={LANGUAGES}
              />

              <Input
                label="Título do Arquivo"
                value={title}
                onChange={setTitle}
                placeholder="index.js"
              />
            </>
          )}

          {activeTab === 'generate' && (
            <>
              <Textarea
                label="Texto do Post"
                value={postText}
                onChange={setPostText}
                placeholder="Cole o texto do post aqui para gerar código automaticamente..."
                rows={5}
              />
              <Button fullWidth onClick={() => generateCodeMutation.mutate({ post: postText })} loading={generateCodeMutation.isPending} leftIcon={<Sparkles className="h-4 w-4" />}>
                {generateCodeMutation.isPending ? 'Gerando...' : 'Gerar Código'}
              </Button>
            </>
          )}

          <div className="pt-2 space-y-4 border-t border-surface-200 dark:border-surface-700">
            <Label>Família da Fonte</Label>
            <Select value={fontFamily} onChange={setFontFamily} options={FONT_FAMILIES} />

            <Label>Tamanho da Fonte</Label>
            <Select value={fontSize} onChange={setFontSize} options={FONT_SIZES} />

            <Label>Tema (Fundo)</Label>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'h-10 rounded-lg border-2 transition-all',
                    theme === t.value ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-surface-200 dark:border-surface-600 hover:border-surface-300 dark:hover:border-surface-500'
                  )}
                  style={{ background: t.gradient }}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={theme === t.value}
                />
              ))}
            </div>

            <Label>Espaçamento</Label>
            <Select value={padding} onChange={setPadding} options={PADDINGS} />

            <Label>Estilo da Janela</Label>
            <Select value={windowStyle} onChange={setWindowStyle} options={WINDOW_STYLES} />

            <div className="flex items-center justify-between">
              <Label className="mb-0">Números de Linha</Label>
              <Switch checked={showLineNumbers} onChange={setShowLineNumbers} />
            </div>
          </div>

          {/* Presets */}
          <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Presets Salvos</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowSavePreset(true)} leftIcon={<Save className="h-3.5 w-3.5" />}>
                Salvar Atual
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleApplyPreset(p)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-all',
                    'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-600 hover:border-primary-500'
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: THEMES.find(t => t.value === p.theme)?.gradient || '#666' }} />
                  <span className="font-medium truncate max-w-[100px]">{p.name}</span>
                  <Badge variant="neutral" size="sm">{p.fontFamily.split(',')[0].replace(/'/g, '')}</Badge>
                  <IconButton variant="danger" size="sm" ariaLabel="Excluir preset" onClick={(e) => { e.stopPropagation(); handleDeletePreset(i) }}>
                    <X className="h-3 w-3" />
                  </IconButton>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-surface-900 dark:text-surface-50">Prévia</h2>
              <p className="text-xs text-surface-500 dark:text-surface-400">Ajuste as configurações ao lado</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCopy} disabled={isRendering} leftIcon={isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}>
              {isRendering ? 'Copiando...' : 'Copiar Imagem'}
            </Button>
            <Button variant="primary" onClick={handleDownload} disabled={isRendering} leftIcon={isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}>
              {isRendering ? 'Baixando...' : 'Baixar PNG'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style={{ background: themeObj?.gradient }}>
          <div ref={previewRef} className="w-full max-w-4xl">
            <div className={cn(
              'rounded-lg overflow-hidden shadow-xl border border-white/10',
              windowStyle === 'none' && 'rounded-lg',
              theme === 'transparent' ? 'bg-transparent' : 'bg-[#1e1e1e]'
            )}>
              {/* Window Header */}
              {(windowStyle !== 'none') && (
                <div className={cn(
                  'h-8 flex items-center px-3 border-b border-white/10',
                  windowStyle === 'mac' && 'bg-[#1a1a1a]',
                  windowStyle === 'simple' && 'bg-[#252526]'
                )}>
                  {windowStyle === 'mac' && (
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                  )}
                  <div className={cn(
                    'flex-1 text-center text-xs font-medium text-[#a1a1aa]',
                    windowStyle === 'simple' && 'text-left ml-2'
                  )}>
                    {title}
                  </div>
                  {windowStyle === 'mac' && <div className="w-12" />}
                </div>
              )}

              {/* Code Area */}
              <div className="flex">
                {showLineNumbers && (
                  <div ref={lineNumbersRef} className={cn(
                    'select-none text-[#4b5563] border-r border-white/10 py-3 px-2 text-right',
                    'font-mono',
                    !showLineNumbers && 'hidden'
                  )} style={{ fontSize }}>
                  </div>
                )}
                <pre className="flex-1 min-w-0 overflow-auto p-4 m-0" style={{ fontSize }}>
                  <code ref={codeRef} className={`language-${language}`} style={{ fontFamily, fontSize, lineHeight: '1.6' }}>
                    {code || ' '}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Preset Modal */}
      <Modal
        isOpen={showSavePreset}
        onClose={() => { setShowSavePreset(false); setNewPresetName('') }}
        title="Salvar Preset"
        description="Dê um nome para esta configuração"
      >
        <Input
          value={newPresetName}
          onChange={setNewPresetName}
          placeholder="Meu Preset"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setShowSavePreset(false); setNewPresetName('') }}>Cancelar</Button>
          <Button variant="primary" onClick={handleSavePreset} disabled={!newPresetName.trim()}>Salvar</Button>
        </div>
      </Modal>
    </div>
  )
}
export default CodeImage