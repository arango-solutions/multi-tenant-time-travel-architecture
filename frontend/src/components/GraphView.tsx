import { useCallback, useEffect, useMemo, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import type { GraphLink, GraphNode, GraphPayload } from '../api'

type GraphViewProps = {
  graph: GraphPayload | null
  loading?: boolean
  isPlaying?: boolean
  resetKey?: string | null
}

const NODE_COLORS: Record<GraphNode['group'], string> = {
  device: '#38bdf8',
  software: '#a78bfa',
  location: '#34d399',
  alert: '#fb7185',
}

const DIM_NODE_COLOR = '#1e293b'
const DIM_LINK_COLOR = 'rgba(148, 163, 184, 0.06)'
const DEFAULT_LINK_COLOR = 'rgba(148, 163, 184, 0.28)'
const HIGHLIGHT_LINK_COLOR = 'rgba(148, 163, 184, 0.85)'

export function GraphView({ graph, loading = false, isPlaying = false, resetKey = null }: GraphViewProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set())
  const graphData = useMemo(
    () => ({
      nodes: graph?.nodes ?? [],
      links: graph?.links ?? [],
    }),
    [graph],
  )
  const hasFocus = focusNodeId !== null

  const clearFocus = useCallback(() => {
    setSelectedNode(null)
    setFocusNodeId(null)
    setHighlightedIds(new Set())
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null)
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

      {loading ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/50 backdrop-blur-sm">
          <div className="rounded-full border border-cyan-400/30 bg-slate-950 px-5 py-3 text-sm text-cyan-100">
            Loading graph snapshot...
          </div>
        </div>
      ) : null}

      {graphData.nodes.length > 0 ? (
        <ForceGraph3D
          graphData={graphData}
          backgroundColor="#020617"
          linkColor={(link) => {
            if (!hasFocus) {
              return DEFAULT_LINK_COLOR
            }

            return isLinkHighlighted(link as GraphLink, highlightedIds) ? HIGHLIGHT_LINK_COLOR : DIM_LINK_COLOR
          }}
          linkOpacity={0.35}
          linkDirectionalParticles={(link) => (isLinkHighlighted(link as GraphLink, highlightedIds) ? 2 : 0)}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleWidth={1.6}
          linkWidth={(link) => (isLinkHighlighted(link as GraphLink, highlightedIds) ? 2 : 1)}
          nodeColor={(node) => {
            const graphNode = node as GraphNode

            if (!hasFocus) {
              return NODE_COLORS[graphNode.group]
            }

            return highlightedIds.has(graphNode.id) ? NODE_COLORS[graphNode.group] : DIM_NODE_COLOR
          }}
          nodeLabel={(node) => (node as GraphNode).label}
          nodeOpacity={0.92}
          nodeResolution={18}
          nodeVal={(node) => {
            const graphNode = node as GraphNode
            const baseSize = graphNode.group === 'alert' ? 7 : 5

            return highlightedIds.has(graphNode.id) ? baseSize * 1.4 : baseSize
          }}
          onNodeClick={handleNodeClick}
          onBackgroundClick={clearFocus}
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

      {selectedNode ? <NodeDetail node={selectedNode} onClose={handleCloseDetail} /> : null}
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

function isLinkHighlighted(link: GraphLink, highlightedIds: Set<string>) {
  const sourceId = getEndpointId(link.source)
  const targetId = getEndpointId(link.target)

  return Boolean(sourceId && targetId && highlightedIds.has(sourceId) && highlightedIds.has(targetId))
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
