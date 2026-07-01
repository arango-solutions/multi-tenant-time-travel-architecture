import { useMemo, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphNode, GraphPayload } from '../api'

type GraphViewProps = {
  graph: GraphPayload | null
  loading?: boolean
}

type RenderableNode = GraphNode & {
  x?: number
  y?: number
}

const NODE_COLORS: Record<GraphNode['group'], string> = {
  device: '#38bdf8',
  software: '#a78bfa',
  location: '#34d399',
  alert: '#fb7185',
}

export function GraphView({ graph, loading = false }: GraphViewProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const graphData = useMemo(
    () => ({
      nodes: graph?.nodes ?? [],
      links: graph?.links ?? [],
    }),
    [graph],
  )

  return (
    <section className="relative min-h-[620px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 shadow-2xl shadow-slate-950/50">
      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-slate-800 bg-slate-950/85 p-4 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Snapshot</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Devices" value={graph?.counts.devices ?? 0} color="text-cyan-300" />
          <Metric label="Software" value={graph?.counts.software ?? 0} color="text-violet-300" />
          <Metric label="Locations" value={graph?.counts.locations ?? 0} color="text-emerald-300" />
          <Metric label="Alerts" value={graph?.counts.alerts ?? 0} color="text-rose-300" />
        </div>
      </div>

      {loading ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/50 backdrop-blur-sm">
          <div className="rounded-full border border-cyan-400/30 bg-slate-950 px-5 py-3 text-sm text-cyan-100">
            Loading graph snapshot...
          </div>
        </div>
      ) : null}

      {graphData.nodes.length > 0 ? (
        <ForceGraph2D
          graphData={graphData}
          backgroundColor="rgba(2, 6, 23, 0)"
          linkColor={() => 'rgba(148, 163, 184, 0.28)'}
          linkDirectionalParticles={1}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleWidth={1.4}
          linkWidth={1}
          nodeCanvasObject={(node, canvasContext, globalScale) =>
            paintNode(node as RenderableNode, canvasContext, globalScale)
          }
          nodePointerAreaPaint={(node, color, canvasContext) => {
            const renderableNode = node as RenderableNode
            canvasContext.fillStyle = color
            canvasContext.beginPath()
            canvasContext.arc(renderableNode.x ?? 0, renderableNode.y ?? 0, 9, 0, 2 * Math.PI, false)
            canvasContext.fill()
          }}
          onNodeClick={(node) => setSelectedNode(node as GraphNode)}
        />
      ) : (
        <div className="grid min-h-[620px] place-items-center px-6 text-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">No graph snapshot loaded</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Start the API, pick a tenant, and move the temporal slider to query a point-in-time topology.
            </p>
          </div>
        </div>
      )}

      {selectedNode ? <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} /> : null}
    </section>
  )
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function paintNode(node: RenderableNode, canvasContext: CanvasRenderingContext2D, globalScale: number) {
  const label = node.label
  const radius = node.group === 'alert' ? 7 : 5.5
  const x = node.x ?? 0
  const y = node.y ?? 0

  canvasContext.beginPath()
  canvasContext.arc(x, y, radius, 0, 2 * Math.PI, false)
  canvasContext.fillStyle = NODE_COLORS[node.group]
  canvasContext.shadowBlur = 12
  canvasContext.shadowColor = NODE_COLORS[node.group]
  canvasContext.fill()
  canvasContext.shadowBlur = 0

  const fontSize = Math.max(3.4, 11 / globalScale)
  canvasContext.font = `${fontSize}px Inter, sans-serif`
  canvasContext.textAlign = 'center'
  canvasContext.textBaseline = 'top'
  canvasContext.fillStyle = 'rgba(226, 232, 240, 0.9)'
  canvasContext.fillText(label, x, y + radius + 2)
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
