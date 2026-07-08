# Demo Handoff Guide
**Multi-Tenant Temporal Graph Reference Implementation**
**For**: Demo Presentation
**System Status**: Fully Operational - All Tests Passing (100%)

---

## Quick Start (5 Minutes)

If you're in a hurry, here's the fastest way to run the demo:

```bash
# 1. Navigate to project and install dependencies
cd /path/to/network-asset-management-demo
pip install -r requirements.txt

# 2. Configure credentials (first time only)
cp .env.example .env
# Edit .env with your Arango credentials

# 3. Run interactive demo
make demo
```

That's it! The demo will guide you through everything with interactive pauses.

> **First time?** `.env` is not in git. Create it from the template:
> `cp .env.example .env`, then edit with your credentials. See the Configuration
> section below.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Demo Setup](#pre-demo-setup)
3. [Running the Interactive Demo](#running-the-interactive-demo)
4. [Demo Flow Overview](#demo-flow-overview)
5. [What to Show During Demo](#what-to-show-during-demo)
6. [Troubleshooting](#troubleshooting)
7. [Post-Demo Cleanup](#post-demo-cleanup)
8. [Advanced Options](#advanced-options)

---

## Prerequisites

### Required Before Demo

1. **Arango Cluster Access**
   - An Arango Oasis cluster endpoint
   - Credentials are in `.env` (see Configuration below)

2. **Python 3.9+**
   - Check: `python3 --version`
   - Install dependencies: `pip install -r requirements.txt`

3. **Project Directory**
   - Clone or locate the `network-asset-management-demo` repository

4. **Web Browser**
   - For Arango Web Interface visualization
   - Login at your cluster endpoint (`$ARANGO_ENDPOINT`)

### Configuration

The project uses a `.env` file for database credentials. A template is
provided at `.env.example`:

```bash
# Create your local credentials file
cp .env.example .env

# Edit .env with your actual credentials:
#   ARANGO_ENDPOINT - your cluster URL
#   ARANGO_USERNAME - database username
#   ARANGO_PASSWORD - database password
#   ARANGO_DATABASE - database name (default: network_assets_demo)
```

`.env` is gitignored and will not be committed. Credentials are loaded
automatically via `python-dotenv`.

### System Status Verification

Before your demo, verify everything is working:

```bash
cd /path/to/network-asset-management-demo

# Run unit tests (21 tests, no database required)
make test

# Run database validation (9 checks, requires Arango connection)
make validate
```

**Expected Output**: 21/21 unit tests passing, 9/9 database validations passing.

---

## Pre-Demo Setup

### Step 1: Navigate to Project

```bash
cd /path/to/network-asset-management-demo
```

### Step 2: Verify Credentials

Ensure your `.env` file exists and has correct credentials:

```bash
ls .env
```

**What this provides** (loaded automatically by `python-dotenv`):
- `ARANGO_ENDPOINT` (database URL)
- `ARANGO_USERNAME` (database user)
- `ARANGO_PASSWORD` (database password)
- `ARANGO_DATABASE` (database name)

**Verification**:
```bash
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('ARANGO_ENDPOINT'))"
# Should show your cluster URL
```

### Step 3: Open Arango Web Interface (Optional but Recommended)

1. Open browser to your cluster endpoint (from `.env`)
2. Login with your credentials
3. Select your database (`$ARANGO_DATABASE`)
4. Keep this open in a separate tab for visualization during demo

---

## Running the Interactive Demo

### Option 1: Interactive Mode (Recommended for Live Demos)

**Best for**: Live presentations where you want to pause and explain each step

```bash
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive
```

**How it works**:
- Demo runs step-by-step
- Pauses at each section
- Press `Enter` to continue to next section
- You control the pace
- Perfect for Q&A during presentation

**Duration**: 15-30 minutes (depending on Q&A)

### Option 2: Auto-Advance Mode (For Quick Demo)

**Best for**: Automated walkthrough or time-constrained demos

```bash
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --auto-advance --pause-duration 5
```

**How it works**:
- Automatically advances every 5 seconds
- No manual intervention needed
- Good for unattended displays
- Adjust `--pause-duration` as needed

**Duration**: ~10 minutes

---

## Demo Flow Overview

The interactive demo walks through 10 major sections:

### Section 0: Database Reset and Cleanup
**Duration**: 1-2 minutes
**What happens**: Cleans previous demo data, ensures fresh start

**Key Points to Mention**:
- "We're starting with a clean database to show everything from scratch"
- "This ensures reproducible demonstrations"

---

### Section 1: Data Generation (8 Tenants)
**Duration**: 2-3 minutes
**What happens**: Generates multi-tenant network asset data

**Tenants Created**:
1. Acme Corp (1x scale)
2. Global Enterprises (2x scale)
3. TechStart Inc (3x scale)
4. Enterprise Solutions (1x scale)
5. CloudSync Systems (2x scale)
6. DataFlow Corp (3x scale)
7. NetWork Industries (1x scale)
8. Digital Dynamics (2x scale)

**Total Data Generated**: ~21,000+ documents across all collections

**Key Points to Mention**:
- "Each tenant has completely isolated data"
- "Different scale factors show system flexibility"
- "Includes devices, software, locations, and relationships"
- "Taxonomy classifications applied automatically"

**What to Show in Browser**:
- Open `data/` directory to show tenant folders
- Each tenant has 15+ JSON files

---

### Section 2: Database Deployment with SmartGraphs
**Duration**: 2-3 minutes
**What happens**: 
- Creates SmartGraph collections
- Loads tenant data with sharding
- Creates indexes (including MDI-prefixed indexes)
- Sets up unified graph structure

**Key Points to Mention**:
- "SmartGraphs provide automatic sharding by tenant"
- "Complete data isolation at the database level"
- "MDI-prefixed indexes optimize temporal queries"
- "Shared collections with tenant-specific data partitioning"

**What to Show in Browser** (Arango Web UI):
1. Navigate to "Collections"
2. Show vertex collections: Device, Software, Location, etc.
3. Show edge collections: hasConnection, hasDeviceSoftware, hasVersion
4. Click on a collection -> "Indexes" tab
5. Point out MDI-prefixed indexes on created/expired fields

---

### Section 3: Initial Validation
**Duration**: 1-2 minutes
**What happens**: Validates deployment, indexes, data integrity

**Key Points to Mention**:
- "All 9 validation tests passing"
- "100% tenant isolation verified"
- "MDI indexes confirmed operational"
- "Ready for production use"

---

### Section 4: Temporal TTL Transactions
**Duration**: 2-3 minutes
**What happens**: 
- Simulates configuration changes
- Shows current vs historical strategy
- Demonstrates TTL field activation

**Key Points to Mention**:
- "Real database transactions, not simulations"
- "Current configurations never expire"
- "Historical configurations automatically age out"
- "Demo mode: 5-minute TTL (production: 30 days)"

**What to Show in Browser**:
The demo provides specific document keys to inspect:
1. Go to "Collections" -> "Device"
2. Search for the document keys shown in demo output
3. Show `expired` and `ttlExpireAt` fields
4. Explain the difference between current and historical

---

### Section 5: Time Travel Demonstration
**Duration**: 2-3 minutes
**What happens**: 
- Queries historical data
- Shows point-in-time analysis
- Demonstrates temporal range queries

**Key Points to Mention**:
- "Can query system state at any point in time"
- "MDI indexes make these queries fast"
- "Critical for compliance and audit trails"
- "Historical data preserved until TTL expires"

**What to Show in Browser**:
1. Go to "Queries" tab
2. Run the time travel query shown in demo:
   ```aql
   FOR device IN Device
     FILTER device.created <= @point_in_time 
     AND device.expired > @point_in_time
     LIMIT 10
     RETURN device
   ```
3. Change the `@point_in_time` value to see different results

---

### Section 6: Alert System (If Deployed)
**Duration**: 1-2 minutes
**What happens**: Shows operational monitoring capabilities

**Key Points to Mention**:
- "Real-time alert generation"
- "TTL-managed lifecycle"
- "Cross-entity correlation"

---

### Section 7: Taxonomy System
**Duration**: 1-2 minutes
**What happens**: Shows hierarchical classification

**Key Points to Mention**:
- "100% classification coverage"
- "Satellite graph for global metadata"
- "Hierarchical class relationships"

---

### Section 8: Scale-Out Operations
**Duration**: 3-5 minutes
**What happens**: 
- Adds new tenants dynamically
- Shows cluster management
- Demonstrates rebalancing

**Key Points to Mention**:
- "Zero downtime tenant addition"
- "Linear scalability"
- "Shard rebalancing optimization"

**Manual Step** (If showing scale-out):
The demo will pause and provide instructions for:
1. Adding database server (via Arango Oasis UI)
2. Rebalancing shards
3. Monitoring distribution

---

### Section 9: Final Validation
**Duration**: 1-2 minutes
**What happens**: Comprehensive system check

**Key Points to Mention**:
- "All tests still passing after operations"
- "Data integrity maintained"
- "Performance metrics within targets"

---

## What to Show During Demo

### Key Visualizations in Arango Web UI

#### 1. Graph Visualizer
1. Navigate to "Graphs" -> `network_assets_smartgraph`
2. Click "Graph" icon to visualize
3. Enter a tenant ID from demo output
4. Show the network topology:
   - Blue nodes = Device proxies
   - Purple nodes = Software
   - Green nodes = Locations
   - Edges show relationships

**Pro Tip**: Use the demo output to get specific vertex IDs for targeted visualization

#### 2. Collection Statistics
1. Navigate to "Collections"
2. Show document counts per collection
3. Demonstrate tenant isolation:
   - Click "Device" collection
   - Use filter: `FILTER doc.tenantId == "tenant_id_here"`
   - Show only that tenant's data appears

#### 3. Query Execution Plans
1. Go to "Queries" tab
2. Run a temporal query
3. Click "Explain" instead of "Execute"
4. Show that MDI index is being used
5. Display query performance metrics

### Key Metrics to Highlight

**Data Scale**:
- 8 tenants
- 21,000+ documents
- 600+ version edges
- Complete multi-tenant isolation

**Performance**:
- Software queries: ~0.11 seconds (420 results)
- Version queries: ~0.10 seconds
- Key generation: 1000 keys < 1 second

**Architecture**:
- Unified SmartGraph attribute (`tenantId`)
- MDI-prefixed multi-dimensional indexes
- Current vs Historical TTL strategy
- Satellite graph for taxonomy

---

## Troubleshooting

### Issue: "Connection failed"

**Symptoms**: Can't connect to database

**Solution**:
```bash
# 1. Check .env file exists
ls .env

# 2. Verify credentials load correctly
python3 -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('ARANGO_ENDPOINT'))"

# 3. If .env is missing, create it:
cp .env.example .env
```

### Issue: "Module not found"

**Symptoms**: Import errors when running demo

**Solution**:
```bash
# Always use PYTHONPATH=. prefix
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive
```

### Issue: "Demo is slow"

**Symptoms**: Data generation taking long time

**Explanation**: This is normal! Generating 21,000+ documents takes 2-3 minutes. The demo is working correctly.

### Issue: "Tests failing"

**Symptoms**: Validation shows failures

**Solution**:
```bash
# Run test verification
PYTHONPATH=. python3 src/validation/test_suite.py

# Should show 21/21 passing
# If not, check database connectivity
```

### Issue: "Can't see data in browser"

**Symptoms**: Collections appear empty in Arango UI

**Solution**:
1. Verify you selected the correct database (`$ARANGO_DATABASE`)
2. Check collection name matches: `Device`, `Software`, etc. (case-sensitive)
3. Refresh the page (F5)

---

## Post-Demo Cleanup

### Option 1: Keep Data for Next Demo

Do nothing! The data persists and you can run the demo again anytime.

### Option 2: Full Reset (For Fresh Demo)

```bash
# This will delete all data and regenerate from scratch
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive
# Select "Yes" when asked about database reset
```

### Option 3: Database Only Reset

```bash
# Reset database without regenerating local data files
PYTHONPATH=. python3 tools/reset_database.py
```

---

## Advanced Options

### Verbose Mode (For Technical Audiences)

```bash
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive --verbose
```

**Shows**: Detailed AQL queries, technical logs, performance metrics

### Custom Pause Duration

```bash
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --auto-advance --pause-duration 10
```

**Use**: For larger projection screens or slower reading audiences

### Run Individual Components

If you want to demo specific parts only:

**Data Generation Only**:
```bash
PYTHONPATH=. python3 src/data_generation/asset_generator.py
```

**Database Deployment Only**:
```bash
PYTHONPATH=. python3 src/database/database_deployment.py
```

**Validation Only**:
```bash
PYTHONPATH=. python3 src/validation/validation_suite.py
```

### Monitor TTL Aging in Real-Time

```bash
# In a separate terminal during demo
PYTHONPATH=. python3 src/ttl/ttl_monitor.py --duration 15
```

**Shows**: Real-time countdown of documents aging out (5-minute demo TTL)

---

## Key Messages for Your Audience

### Business Value

1. **Complete Tenant Isolation**: "Each customer's data is physically partitioned - impossible to cross-contaminate"
2. **Temporal Analytics**: "Query your system state at any point in time for compliance and auditing"
3. **Linear Scalability**: "Add tenants without performance degradation - tested with 8+ tenants"
4. **Zero Downtime Operations**: "Add new customers while system stays online"

### Technical Highlights

1. **SmartGraph Architecture**: "Automatic data sharding with unified query interface"
2. **MDI-Prefixed Indexes**: "Multi-dimensional indexes optimize time travel queries"
3. **TTL Lifecycle Management**: "Automatic historical data cleanup - current data never expires"
4. **Production Ready**: "30/30 tests passing, enterprise-grade quality"

### Competitive Advantages

1. **Time Travel Built-In**: Most graph databases require custom solutions
2. **True Multi-Tenancy**: Not just logical separation - physical isolation
3. **Automatic Scaling**: SmartGraphs handle distribution automatically
4. **Operational Simplicity**: One database, complete isolation, unified management

---

## Demo Script Suggestions

### Opening (30 seconds)

"Today I'm showing you a reference implementation for multi-tenant temporal graph databases using Arango. This demonstrates complete tenant isolation, time travel capabilities, and horizontal scalability - all production-ready features."

### During Data Generation (1 minute)

"We're generating 8 tenant datasets with over 21,000 documents total. Each tenant has their own network of devices, software, locations, and relationships. Notice the different scale factors - showing the system handles varying workload sizes."

### During Deployment (1 minute)

"Now we're deploying to Arango with SmartGraphs - that's automatic sharding by tenant ID. The system creates MDI-prefixed multi-dimensional indexes that optimize our temporal queries. In the browser here, you can see all the collections being created with proper isolation."

### During Time Travel Demo (2 minutes)

"This is where it gets interesting. We can query our system state at any point in time. Let me show you in the browser - [run query] - see how we're filtering by created and expired timestamps? The MDI indexes make this fast even with thousands of documents. This is critical for compliance and auditing."

### During Scale-Out (2 minutes)

"One of the key features is horizontal scalability. We can add new tenants dynamically - watch the document count grow - and there's zero impact on existing tenants. In production, you'd also add database servers and rebalance shards, which I'll show you how to do..."

### Closing (30 seconds)

"So we've shown complete tenant isolation, temporal queries, automatic TTL management, and scale-out capabilities. The system is production-ready with 30 out of 30 tests passing. All the code is available in the GitHub repository, and I'm happy to answer questions."

---

## Quick Reference Card

**Start Demo**:
```bash
cd /path/to/project
PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive
```

**Emergency Stop**: Press `Ctrl+C`

**Arango UI**: `$ARANGO_ENDPOINT`

**Test System**:
```bash
PYTHONPATH=. python3 src/validation/test_suite.py
```

**Expected Result**: "All tests passed! Code quality verified."

---

## Support Contacts

**Primary Contact**: Arthur Keen
**Documentation**: See `README.md`, `DEMO_QUICK_START.md`, `docs/TEST_STATUS.md`

---

## Final Checklist

Before you start your demo, verify:

- [ ] Can access project directory
- [ ] `.env` file configured (created from `.env.example`)
- [ ] Can connect to Arango (browser login works)
- [ ] Tests pass (run quick verification)
- [ ] Have backup internet connection
- [ ] Familiarized with Arango Web UI
- [ ] Know where pause points are in demo
- [ ] Prepared for Q&A on multi-tenancy and time travel

---

## Success Criteria

Your demo is successful if you've shown:

- [DONE] Multi-tenant data generation and isolation
- [DONE] Database deployment with SmartGraphs
- [DONE] Time travel queries with temporal data
- [DONE] Performance metrics within targets
- [DONE] System validation at 100%
- [DONE] Scale-out capabilities (conceptually)

**Good luck with your demo!**

---

**Document Version**: 2.0
**Last Updated**: March 2026
**System Status**: All tests passing (30/30 - 100%)
**Ready for**: Production demos and customer presentations
