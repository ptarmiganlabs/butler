# UDP Queue Metrics to InfluxDB

## Overview

Butler can persist internal UDP queue metrics to InfluxDB for long-term storage, graphing, alerting, and analysis. These metrics provide visibility into Butler's internal reliability and operational health when processing UDP messages from Qlik Sense schedulers.

This feature is optional and disabled by default.

## Prerequisites

- InfluxDB must be configured and enabled in Butler (`Butler.influxDb.enable: true`)
- The UDP server must be enabled (`Butler.udpServerConfig.enable: true`)

## What Metrics Are Collected

Butler tracks internal metrics about how it processes incoming UDP messages. These metrics are grouped into six categories, each of which can be independently enabled or disabled:

### Drop Counters (`dropCounters`)

Tracks messages that were dropped before processing, by reason:

| Field | Description |
|-------|-------------|
| `messages_dropped_total` | Total messages dropped (all reasons combined) |
| `messages_dropped_queue_full` | Messages dropped because the processing queue was full |
| `messages_dropped_rate_limit` | Messages dropped due to rate limiting |
| `messages_dropped_size` | Messages dropped because they exceeded the maximum message size |

### Message Counters (`messageCounters`)

Tracks the overall message flow through the system:

| Field | Description |
|-------|-------------|
| `messages_received` | Total UDP messages received (including dropped) |
| `messages_queued` | Messages successfully added to the processing queue |
| `messages_processed` | Messages successfully processed |
| `messages_failed` | Messages that failed during processing |

### Queue State (`queueState`)

Tracks the current health and utilization of the processing queue:

| Field | Description |
|-------|-------------|
| `queue_size` | Current number of messages waiting in the queue |
| `queue_utilization_pct` | Queue utilization as a percentage (0-100) |
| `queue_pending` | Number of messages currently being processed |
| `backpressure_active` | Whether backpressure is active (1 = active, 0 = inactive) |

### Processing Times (`processingTimes`)

Tracks how long messages take to process (based on the last 1000 messages):

| Field | Description |
|-------|-------------|
| `processing_time_avg_ms` | Average processing time in milliseconds |
| `processing_time_p95_ms` | 95th percentile processing time in milliseconds |
| `processing_time_max_ms` | Maximum processing time in milliseconds |

### Deduplication (`dedup`)

Tracks the deduplication cache that prevents processing duplicate messages:

| Field | Description |
|-------|-------------|
| `deduplication_cache_size` | Number of entries currently in the deduplication cache |
| `messages_dropped_duplicate` | Messages dropped because they were identified as duplicates |

### Rate Limit (`rateLimit`)

Tracks the current message rate for rate limiting:

| Field | Description |
|-------|-------------|
| `rate_limit_current` | Current message rate (messages per minute, projected) |

## Configuration

The feature is configured under `Butler.udpServerConfig.queueMetrics.influxdb`:

```yaml
Butler:
    udpServerConfig:
        queueMetrics:
            influxdb:
                enable: false                    # Master switch for InfluxDB writing
                writeFrequency: 20000            # Write interval in milliseconds
                measurementName: butler_udp_queue # InfluxDB measurement name
                tags: []                         # Feature-specific tags
                metrics:
                    dropCounters:
                        enable: true
                    messageCounters:
                        enable: true
                    queueState:
                        enable: true
                    processingTimes:
                        enable: true
                    dedup:
                        enable: true
                    rateLimit:
                        enable: true
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enable` | boolean | `false` | Master switch. Must be `true` AND `Butler.influxDb.enable` must be `true` for metrics to be written. |
| `writeFrequency` | number | `20000` | How often (in milliseconds) metrics are written to InfluxDB. |
| `measurementName` | string | `butler_udp_queue` | The InfluxDB measurement name to use. |
| `tags` | array | `[]` | Optional feature-specific tags added to every data point, in addition to the global InfluxDB tags. |
| `metrics.*.enable` | boolean | `true` | Per-category enable/disable switch. Set to `false` to exclude that category's fields from the written data points. |

### Tags

Every data point written to InfluxDB includes:

1. **Global static tags** from `Butler.influxDb.tag.static` (e.g., `butler_instance`, `environment`)
2. **Feature-specific tags** from `Butler.udpServerConfig.queueMetrics.influxdb.tags`
3. **`queue_type`** tag derived from the queue manager (e.g., `task_results`)

## How It Works

The feature uses a **snapshot-and-reset** pattern:

1. At each write interval, Butler takes a snapshot of all current metric counters
2. The snapshot is written to InfluxDB as a single data point
3. Counters are then reset to zero

This means each data point in InfluxDB represents the **delta** (change) since the last write. This is ideal for Grafana queries using `rate()`, `difference()`, or `nonNegativeDerivative()` functions.

## Example Grafana Queries

### Messages dropped per minute (by reason)

```sql
SELECT difference("messages_dropped_queue_full") AS "queue_full",
       difference("messages_dropped_rate_limit") AS "rate_limit",
       difference("messages_dropped_size") AS "size",
       difference("messages_dropped_duplicate") AS "duplicate"
FROM "butler_udp_queue"
WHERE $timeFilter
GROUP BY time(1m) fill(null)
```

### Queue utilization over time

```sql
SELECT mean("queue_utilization_pct") AS "utilization"
FROM "butler_udp_queue"
WHERE $timeFilter
GROUP BY time($__interval) fill(null)
```

### Processing time percentiles

```sql
SELECT mean("processing_time_avg_ms") AS "avg",
       mean("processing_time_p95_ms") AS "p95",
       mean("processing_time_max_ms") AS "max"
FROM "butler_udp_queue"
WHERE $timeFilter
GROUP BY time($__interval) fill(null)
```

### Messages processed per minute

```sql
SELECT difference("messages_processed") AS "processed",
       difference("messages_failed") AS "failed"
FROM "butler_udp_queue"
WHERE $timeFilter
GROUP BY time(1m) fill(null)
```
