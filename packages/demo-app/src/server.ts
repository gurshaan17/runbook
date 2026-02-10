import express, { Request, Response, NextFunction, Express } from 'express'
import { collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'
import { logger } from './utils/logger'
import { MemoryLeakBug } from './bugs/memory-leak'
import { ErrorSpamBug } from './bugs/error-spam'
import { CpuSpikeBug } from './bugs/cpu-spike'
import { createHealthRouter } from './routes/health'
import { createMetricsRouter } from './routes/metrics'
import { createTriggerRouter } from './routes/trigger'

const app: Express = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()

    res.on('finish', () => {
        const duration = Date.now() - start
        logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
        })
    })

    next()
})

// Initialize Prometheus metrics
collectDefaultMetrics({ prefix: 'demo_app_' })

const httpRequestsTotal = new Counter({
    name: 'demo_app_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
})

const httpRequestDuration = new Histogram({
    name: 'demo_app_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
})

const errorRateGauge = new Gauge({
    name: 'demo_app_error_rate',
    help: 'Current error rate percentage',
})

const memoryUsageGauge = new Gauge({
    name: 'demo_app_memory_usage_mb',
    help: 'Current memory usage in MB',
})

// Initialize bug simulators
const memoryLeakBug = new MemoryLeakBug()
const errorSpamBug = new ErrorSpamBug()
const cpuSpikeBug = new CpuSpikeBug()

// Update memory metrics every 5 seconds
setInterval(() => {
    const usage = process.memoryUsage()
    memoryUsageGauge.set(usage.heapUsed / 1024 / 1024)
}, 5000)

// Metrics middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000

        httpRequestsTotal.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode,
        })

        httpRequestDuration.observe(
            {
                method: req.method,
                route: req.route?.path || req.path,
                status: res.statusCode,
            },
            duration
        )
    })

    next()
})

// ==================== ROUTES ====================

app.use(
    createHealthRouter({
        memoryLeakBug,
        errorSpamBug,
        cpuSpikeBug,
    })
)
app.use(createMetricsRouter())
app.use(
    createTriggerRouter({
        memoryLeakBug,
        errorSpamBug,
        cpuSpikeBug,
    })
)

// ==================== APPLICATION ENDPOINTS ====================

// Main data endpoint (affected by error spam bug)
//@ts-ignore
app.get('/api/data', (req: Request, res: Response) => {
    // Check if error spam is active
    if (errorSpamBug.shouldError()) {
        const error = new Error('Database query timeout')
        logger.error('API Error', {
            endpoint: '/api/data',
            error: error.message,
            stack: error.stack,
        })

        errorRateGauge.inc()

        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Database query timeout after 30 seconds',
            timestamp: new Date().toISOString(),
        })
        return
    }

    // Normal response
    res.json({
        success: true,
        data: {
            users: 1234,
            activeConnections: 42,
            lastUpdate: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
    })
})

// Sample endpoint - always works
//@ts-ignore
app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        status: 'operational',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    })
})

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    })
})

// Global error handler
//@ts-ignore
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    })

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message,
    })
})

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
    logger.info('Demo App Started', {
        port: PORT,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
    })

    console.log(`
╔════════════════════════════════════════════╗
║     🚀 Demo App Server Running             ║
╠════════════════════════════════════════════╣
║  Port:        ${PORT}                      ║
║  Health:      http://localhost:${PORT}/health       ║
║  Metrics:     http://localhost:${PORT}/metrics      ║
║  API:         http://localhost:${PORT}/api/data     ║
╠════════════════════════════════════════════╣
║  Bug Triggers:                             ║
║  POST /trigger/memory-leak                 ║
║  POST /trigger/error-spam                  ║
║  POST /trigger/cpu-spike                   ║
╚════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully')

    server.close(() => {
        logger.info('Server closed')
        process.exit(0)
    })

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
    }, 10000)
})

export default app
