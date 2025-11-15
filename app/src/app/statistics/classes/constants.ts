// Constants for the class statistics page
export const CHART_CONFIG = {
  HEIGHT: 32,
  WHISKER_LINE_HEIGHT: 2,
  BOX_HEIGHT: 16,
  MEDIAN_LINE_WIDTH: 2,
  MEAN_DOT_SIZE: 4,
  OUTLIER_SIZE: 6,
  PADDING: 8,
} as const

export const CARD_STYLES = {
  CONTAINER: "rounded-2xl border border-gray-800/80 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10",
  HEADER: "flex items-center gap-3 mb-6",
  ICON_CONTAINER: "flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30",
  TITLE: "text-lg font-bold text-white",
  SUBTITLE: "text-xs text-gray-400",
} as const

export const PLOT_STYLES = {
  CONTAINER: "relative h-8 bg-gray-800/60 rounded-lg overflow-hidden",
  WHISKER_LINE: "absolute h-0.5",
  BOX: "absolute h-4 rounded",
  MEDIAN_LINE: "absolute w-0.5 h-5 bg-white",
  MEAN_DOT: "absolute w-1 h-3 rounded-full bg-yellow-400",
  OUTLIER: "absolute w-1.5 h-1.5 rounded-full bg-red-400 border border-red-300",
} as const

export const LEGEND_STYLES = {
  CONTAINER: "mt-4 pt-4 border-t border-gray-700/50",
  CONTENT: "flex items-center justify-between text-xs text-gray-400",
  ITEM: "flex items-center gap-1",
} as const

export const SKELETON_STYLES = {
  CONTAINER: "space-y-6",
  HEADER: "animate-pulse h-8 w-64 rounded bg-gray-700/50 mb-2",
  SUBTITLE: "h-4 w-96 rounded bg-gray-700/50",
  CARD: "rounded-2xl border border-gray-800/80 bg-gray-900/50 p-6",
  TITLE: "h-6 w-48 rounded bg-gray-700/50 mb-4",
  ROW: "flex justify-between h-4 w-32 rounded bg-gray-700/50",
  STATS: "h-3 w-24 rounded bg-gray-700/50",
  BAR: "h-8 rounded bg-gray-700/30",
} as const