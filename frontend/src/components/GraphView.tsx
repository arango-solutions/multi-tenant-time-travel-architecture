import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods as ForceGraph3DMethods } from 'react-force-graph-3d'
import ForceGraph3D from 'react-force-graph-3d'
import { AmbientLight, Color, DirectionalLight, Mesh, MeshPhongMaterial, SphereGeometry, Vector2 } from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { GraphLink, GraphNode, GraphPayload } from '../api'

type GraphViewProps = {
  graph: GraphPayload | null
  loading?: boolean
  isPlaying?: boolean
  resetKey?: string | null
}

type ViewMode = '2d' | '3d'

type GraphNodeWithPosition = GraphNode & {
  x?: number
  y?: number
  z?: number
}

const NODE_COLORS: Record<GraphNode['group'], string> = {
  device: '#22d3ee',
  software: '#c084fc',
  location: '#34d399',
  alert: '#fb7185',
}

const DIM_NODE_COLOR = '#1e293b'
const DIM_LINK_COLOR = 'rgba(148, 163, 184, 0.06)'
const DEFAULT_LINK_COLOR = 'rgba(125, 211, 252, 0.22)'
const HIGHLIGHT_LINK_COLOR = 'rgba(226, 232, 240, 0.9)'
const GRAPH_BACKGROUND = '#020617'
const NODE_REL_SIZE = 4
const MIN_GRAPH_WIDTH = 320
const MIN_GRAPH_HEIGHT = 420

export function GraphView({ graph, loading = false, isPlaying = false, resetKey = null }: GraphViewProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const graph3dRef = useRef<ForceGraph3DMethods<GraphNode, GraphLink> | undefined>(undefined)
  const { width, height } = useElementSize(containerRef)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const graphData = useMemo(
    () => ({
      nodes: graph?.nodes ?? [],
      links: graph?.links ?? [],
    }),
    [graph],
  )
  const degreeMap = useMemo(() => buildDegreeMap(graphData.links), [graphData.links])
  const hasFocus = focusNodeId !== null
  const graphWidth = Math.max(width, MIN_GRAPH_WIDTH)
  const graphHeight = Math.max(height, MIN_GRAPH_HEIGHT)

  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (!hasFocus) {
        return NODE_COLORS[node.group]
      }

      return highlightedIds.has(node.id) ? NODE_COLORS[node.group] : DIM_NODE_COLOR
    },
    [hasFocus, highlightedIds],
  )

  const getNodeValue = useCallback(
    (node: GraphNode) => {
      const baseSize = node.group === 'alert' ? 7.5 : 5
      const degree = degreeMap.get(node.id) ?? 0
      const scaledSize = baseSize + Math.min(9, Math.sqrt(degree) * 3.2)

      return highlightedIds.has(node.id) ? scaledSize * 1.35 : scaledSize
    },
    [degreeMap, highlightedIds],
  )

  const getLinkColor = useCallback(
    (link: GraphLink) => {
      if (!hasFocus) {
        return DEFAULT_LINK_COLOR
      }

      return isLinkHighlighted(link, highlightedIds) ? HIGHLIGHT_LINK_COLOR : DIM_LINK_COLOR
    },
    [hasFocus, highlightedIds],
  )

  const getLinkWidth = useCallback(
    (link: GraphLink) => {
      if (isLinkHighlighted(link, highlightedIds)) {
        return viewMode === '2d' ? 2.4 : 2
      }

      return viewMode === '2d' ? 0.7 : 0.8
    },
    [highlightedIds, viewMode],
  )

  const clearFocus = useCallback(() => {
    setSelectedNode(null)
    setFocusNodeId(null)
    setHighlightedIds(new Set())
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeHover = useCallback((node: unknown) => {
    setHoveredNodeId(node ? (node as GraphNode).id : null)
  }, [])

  const handleNodeClick = useCallback(
    (node: unknown) => {
      const graphNode = node as GraphNode
      const isAlreadyHighlighted = focusNodeId !== null && highlightedIds.has(graphNode.id)

      setSelectedNode(graphNode)

      if (isAlreadyHighlighted) {
        return
      }

      setFocusNodeId(graphNode.id)
      setHighlightedIds(new Set([graphNode.id]))
    },
    [focusNodeId, highlightedIds],
  )

  useEffect(() => {
    clearFocus()
  }, [clearFocus, resetKey])

  useEffect(() => {
    if (!graph || !isPlaying || !focusNodeId) {
      return
    }

    setHighlightedIds((currentIds) => {
      if (currentIds.size === 0) {
        return currentIds
      }

      const nextIds = new Set(currentIds)

      graph.links.forEach((link) => {
        const sourceId = getEndpointId(link.source)
        const targetId = getEndpointId(link.target)

        if (!sourceId || !targetId) {
          return
        }

        if (currentIds.has(sourceId)) {
          nextIds.add(targetId)
        }

        if (currentIds.has(targetId)) {
          nextIds.add(sourceId)
        }
      })

      return nextIds.size === currentIds.size ? currentIds : nextIds
    })
  }, [focusNodeId, graph, isPlaying])

  useEffect(() => {
    if (viewMode !== '3d' || !graph3dRef.current || graphData.nodes.length === 0) {
      return
    }

    const graph3d = graph3dRef.current
    const composer = graph3d.postProcessingComposer()
    const hasBloomPass = composer.passes.some((pass) => pass instanceof UnrealBloomPass)

    if (!hasBloomPass) {
      composer.addPass(new UnrealBloomPass(new Vector2(graphWidth, graphHeight), 0.48, 0.42, 0.24))
    }

    graph3d.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))
    graph3d.lights([
      new AmbientLight(0x8fb8ff, 1.1),
      new DirectionalLight(0xffffff, 1.35),
      new DirectionalLight(0x38bdf8, 0.55),
    ])
  }, [graphData.nodes.length, graphHeight, graphWidth, viewMode])

  const createThreeNode = useCallback(
    (node: unknown) => {
      const graphNode = node as GraphNode
      const color = getNodeColor(graphNode)
      const isActive = !hasFocus || highlightedIds.has(graphNode.id)
      const radius = Math.sqrt(getNodeValue(graphNode)) * 0.85
      const material = new MeshPhongMaterial({
        color,
        emissive: new Color(color),
        emissiveIntensity: isActive ? 0.4 : 0.08,
        shininess: 55,
        transparent: true,
        opacity: isActive ? 0.96 : 0.34,
      })

      return new Mesh(new SphereGeometry(radius, 18, 18), material)
    },
    [getNodeColor, getNodeValue, hasFocus, highlightedIds],
  )

  const drawNode2d = useCallback(
    (node: unknown, context: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNodeWithPosition
      const x = graphNode.x ?? 0
      const y = graphNode.y ?? 0
      const value = getNodeValue(graphNode)
      const radius = Math.sqrt(value) * NODE_REL_SIZE
      const isHighlighted = !hasFocus || highlightedIds.has(graphNode.id)
      const isHovered = hoveredNodeId === graphNode.id
      const color = getNodeColor(graphNode)

      context.save()
      context.beginPath()
      context.arc(x, y, radius + (isHighlighted ? 4 : 2), 0, 2 * Math.PI, false)
      context.fillStyle = isHighlighted ? `${color}2f` : 'rgba(15, 23, 42, 0.5)'
      context.shadowColor = isHighlighted ? color : 'transparent'
      context.shadowBlur = isHighlighted ? 18 : 0
      context.fill()

      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI, false)
      context.fillStyle = color
      context.globalAlpha = isHighlighted ? 0.95 : 0.42
      context.fill()

      context.lineWidth = Math.max(0.6, 1.5 / globalScale)
      context.strokeStyle = isHighlighted ? 'rgba(248, 250, 252, 0.75)' : 'rgba(100, 116, 139, 0.35)'
      context.stroke()

      if (isHighlighted || isHovered) {
        const fontSize = Math.max(7, 12 / globalScale)
        const label = graphNode.label
        const labelWidth = context.measureText(label).width
        const labelX = x + radius + 4
        const labelY = y + fontSize / 2

        context.globalAlpha = 1
        context.font = `${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
        context.fillStyle = 'rgba(2, 6, 23, 0.78)'
        context.fillRect(labelX - 4, labelY - fontSize, labelWidth + 8, fontSize + 6)
        context.fillStyle = isHighlighted ? '#e2e8f0' : '#94a3b8'
        context.fillText(label, labelX, labelY)
      }

      context.restore()
    },
    [getNodeColor, getNodeValue, hasFocus, highlightedIds, hoveredNodeId],
  )

  const paintNodePointerArea = useCallback(
    (node: unknown, color: string, context: CanvasRenderingContext2D) => {
      const graphNode = node as GraphNodeWithPosition
      const radius = Math.sqrt(getNodeValue(graphNode)) * NODE_REL_SIZE + 6

      context.fillStyle = color
      context.beginPath()
      context.arc(graphNode.x ?? 0, graphNode.y ?? 0, radius, 0, 2 * Math.PI, false)
      context.fill()
    },
    [getNodeValue],
  )

  return (
    <section
      ref={containerRef}
      className={`relative h-[70vh] min-h-[520px] w-full overflow-hidden rounded-3xl border border-cyan-500/10 bg-slate-950/80 shadow-2xl shadow-cyan-950/20 ring-1 ring-white/5 lg:h-full lg:min-h-0 ${
        isFullscreen ? 'fixed inset-3 z-50 h-auto min-h-0 rounded-3xl' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.12),transparent_28rem),radial-gradient(circle_at_80%_75%,rgba(192,132,252,0.12),transparent_24rem)]" />
      <div className="absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/60 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Snapshot</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Devices" value={graph?.counts.devices ?? 0} color="text-cyan-300" />
          <Metric label="Software" value={graph?.counts.software ?? 0} color="text-violet-300" />
          <Metric label="Locations" value={graph?.counts.locations ?? 0} color="text-emerald-300" />
          <Metric label="Alerts" value={graph?.counts.alerts ?? 0} color="text-rose-300" />
        </div>
        {focusNodeId ? (
          <>
            <p className="mt-3 max-w-48 text-xs leading-5 text-cyan-200">
              {isPlaying ? 'Playing traces connections over time.' : 'Press Play to trace connections over time.'}
            </p>
            <button
              type="button"
              className="mt-3 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
              onClick={clearFocus}
            >
              Reset highlight
            </button>
          </>
        ) : null}
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2">
        <div className="flex rounded-full border border-slate-700/80 bg-slate-950/80 p-1 shadow-xl backdrop-blur">
          {(['3d', '2d'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                viewMode === mode
                  ? 'bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-100'
              }`}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur transition hover:border-cyan-300 hover:text-cyan-100"
          onClick={() => setIsFullscreen((current) => !current)}
        >
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {loading ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/50 backdrop-blur-sm">
          <div className="rounded-full border border-cyan-400/30 bg-slate-950 px-5 py-3 text-sm text-cyan-100">
            Loading graph snapshot...
          </div>
        </div>
      ) : null}

      {graphData.nodes.length > 0 ? (
        viewMode === '3d' ? (
          <ForceGraph3D
            ref={graph3dRef}
            graphData={graphData}
            width={graphWidth}
            height={graphHeight}
            backgroundColor={GRAPH_BACKGROUND}
            showNavInfo={false}
            rendererConfig={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            warmupTicks={80}
            cooldownTicks={120}
            d3VelocityDecay={0.32}
            linkColor={(link) => getLinkColor(link as GraphLink)}
            linkOpacity={0.34}
            linkDirectionalParticles={(link) => (isLinkHighlighted(link as GraphLink, highlightedIds) ? 3 : 0)}
            linkDirectionalParticleColor={() => '#67e8f9'}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={1.8}
            linkWidth={(link) => getLinkWidth(link as GraphLink)}
            nodeColor={(node) => getNodeColor(node as GraphNode)}
            nodeLabel={(node) => (node as GraphNode).label}
            nodeOpacity={0.94}
            nodeRelSize={NODE_REL_SIZE}
            nodeResolution={16}
            nodeThreeObject={createThreeNode}
            nodeVal={(node) => getNodeValue(node as GraphNode)}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={clearFocus}
          />
        ) : (
          <ForceGraph2D
            graphData={graphData}
            width={graphWidth}
            height={graphHeight}
            backgroundColor={GRAPH_BACKGROUND}
            warmupTicks={80}
            cooldownTicks={120}
            d3VelocityDecay={0.28}
            autoPauseRedraw={!isPlaying}
            linkColor={(link) => getLinkColor(link as GraphLink)}
            linkDirectionalParticles={(link) => (isLinkHighlighted(link as GraphLink, highlightedIds) ? 3 : 0)}
            linkDirectionalParticleColor={() => '#67e8f9'}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleWidth={2.2}
            linkWidth={(link) => getLinkWidth(link as GraphLink)}
            nodeCanvasObject={drawNode2d}
            nodeCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={paintNodePointerArea}
            nodeRelSize={NODE_REL_SIZE}
            nodeVal={(node) => getNodeValue(node as GraphNode)}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onBackgroundClick={clearFocus}
          />
        )
      ) : (
        <div className="relative z-10 grid h-full min-h-[420px] place-items-center px-6 text-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">No graph snapshot loaded</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Start the API, pick a tenant, and move the temporal slider to query a point-in-time topology.
            </p>
          </div>
        </div>
      )}

      {selectedNode ? <NodeDetail node={selectedNode} onClose={handleCloseDetail} /> : null}
    </section>
  )
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: MIN_GRAPH_WIDTH, height: MIN_GRAPH_HEIGHT })

  useEffect(() => {
    const element = ref.current

    if (!element) {
      return undefined
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect()

      setSize({
        width: Math.max(Math.floor(rect.width), MIN_GRAPH_WIDTH),
        height: Math.max(Math.floor(rect.height), MIN_GRAPH_HEIGHT),
      })
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [ref])

  return size
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function isLinkHighlighted(link: GraphLink, highlightedIds: Set<string>) {
  const sourceId = getEndpointId(link.source)
  const targetId = getEndpointId(link.target)

  return Boolean(sourceId && targetId && highlightedIds.has(sourceId) && highlightedIds.has(targetId))
}

function buildDegreeMap(links: GraphLink[]) {
  const degreeMap = new Map<string, number>()

  links.forEach((link) => {
    const sourceId = getEndpointId(link.source)
    const targetId = getEndpointId(link.target)

    if (sourceId) {
      degreeMap.set(sourceId, (degreeMap.get(sourceId) ?? 0) + 1)
    }

    if (targetId) {
      degreeMap.set(targetId, (degreeMap.get(targetId) ?? 0) + 1)
    }
  })

  return degreeMap
}

function getEndpointId(endpoint: string | GraphNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id
}

function NodeDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const entries = Object.entries(node.data)
    .filter(([key]) => !['_id', '_key'].includes(key))
    .slice(0, 12)

  return (
    <aside className="absolute bottom-4 right-4 z-10 max-h-[70%] w-80 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{node.group}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-100">{node.label}</h3>
        </div>
        <button className="rounded-full px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100" onClick={onClose}>
          x
        </button>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{key}</dt>
            <dd className="mt-1 break-words text-slate-200">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function formatValue(value: unknown) {
  if (typeof value === 'number' && value > 1_000_000_000) {
    return new Date(value * 1000).toLocaleString()
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  return String(value)
}
