package middleware

import (
	"log"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// MetricsCollector holds application metrics
type MetricsCollector struct {
	mu                    sync.RWMutex
	requestCount          int64
	errorCount            int64
	totalLatencyMs        int64
	optimizationCount     int64
	optimizationLatencyMs int64
	cacheHits             int64
	cacheMisses           int64
}

var globalMetrics = &MetricsCollector{}

// MetricsMiddleware tracks request metrics
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Record metrics
		latency := time.Since(start)
		statusCode := c.Writer.Status()

		globalMetrics.mu.Lock()
		globalMetrics.requestCount++
		globalMetrics.totalLatencyMs += latency.Milliseconds()
		if statusCode >= 400 {
			globalMetrics.errorCount++
		}
		globalMetrics.mu.Unlock()
	}
}

// RecordOptimization records optimization-specific metrics
func RecordOptimization(latencyMs int64, cacheHit bool) {
	globalMetrics.mu.Lock()
	defer globalMetrics.mu.Unlock()

	globalMetrics.optimizationCount++
	globalMetrics.optimizationLatencyMs += latencyMs
	if cacheHit {
		globalMetrics.cacheHits++
	} else {
		globalMetrics.cacheMisses++
	}
}

// GetMetrics returns current metrics (thread-safe)
func GetMetrics() map[string]interface{} {
	globalMetrics.mu.RLock()
	defer globalMetrics.mu.RUnlock()

	avgLatency := int64(0)
	if globalMetrics.requestCount > 0 {
		avgLatency = globalMetrics.totalLatencyMs / globalMetrics.requestCount
	}

	avgOptLatency := int64(0)
	if globalMetrics.optimizationCount > 0 {
		avgOptLatency = globalMetrics.optimizationLatencyMs / globalMetrics.optimizationCount
	}

	cacheHitRate := 0.0
	totalCacheRequests := globalMetrics.cacheHits + globalMetrics.cacheMisses
	if totalCacheRequests > 0 {
		cacheHitRate = float64(globalMetrics.cacheHits) / float64(totalCacheRequests) * 100
	}

	errorRate := 0.0
	if globalMetrics.requestCount > 0 {
		errorRate = float64(globalMetrics.errorCount) / float64(globalMetrics.requestCount) * 100
	}

	return map[string]interface{}{
		"total_requests":              globalMetrics.requestCount,
		"total_errors":                globalMetrics.errorCount,
		"error_rate_pct":              errorRate,
		"avg_latency_ms":              avgLatency,
		"optimization_count":          globalMetrics.optimizationCount,
		"avg_optimization_latency_ms": avgOptLatency,
		"cache_hits":                  globalMetrics.cacheHits,
		"cache_misses":                globalMetrics.cacheMisses,
		"cache_hit_rate_pct":          cacheHitRate,
	}
}

// LogMetricsPeriodically logs metrics every interval
func LogMetricsPeriodically(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			metrics := GetMetrics()
			log.Printf("[Metrics] requests=%d, errors=%d, error_rate=%.2f%%, avg_latency=%dms, optimizations=%d, avg_opt_latency=%dms, cache_hit_rate=%.2f%%",
				metrics["total_requests"],
				metrics["total_errors"],
				metrics["error_rate_pct"],
				metrics["avg_latency_ms"],
				metrics["optimization_count"],
				metrics["avg_optimization_latency_ms"],
				metrics["cache_hit_rate_pct"])
		}
	}()
}
