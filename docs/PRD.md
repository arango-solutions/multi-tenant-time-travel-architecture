# Product Requirements Document: Scalable Multi-Tenant Temporal Graph Reference Implementation

## 1. Overview

This document outlines the requirements for a comprehensive reference implementation showcasing Arango's capabilities for scalable multi-tenant temporal graph architectures. The reference implementation provides production-ready patterns for tenant isolation, horizontal scale-out, and temporal data lifecycle management, using network asset management as a concrete demonstration domain.

The network asset management demo supports multi-tenant architecture using Arango SmartGraphs, with each tenant having completely isolated data containing their network assets, devices, locations, and relationships.

## 2. Project Goals

The primary objective is to create a fully automated, end-to-end demo lifecycle that proves Arango's suitability for large-scale, multi-tenant graph applications. Specific goals include:

* **Multi-Tenancy:** Demonstrate the use of **disjoint SmartGraphs** to provide strong data isolation for each tenant.

* **Horizontal Scale-Out:** Showcase the ability to seamlessly add a new database server to the cluster and rebalance tenant data to leverage the new capacity.

* **Temporal Data Management:** Implement the **time travel blueprint** and utilize **TTL indexes** to automatically expire outdated network observations, ensuring the database remains lean and performant.

* **Automation:** Automate all aspects of the demo, from cluster provisioning to data loading and a continuous "keep-alive" data stream.

### Additional Objectives
- **Complete Data Isolation**: Each tenant's data must be completely isolated from other tenants
- **Scalable Architecture**: Support for numerous tenants without performance degradation
- **Backward Compatibility**: Maintain existing data generation capabilities

### Success Criteria
- Generate isolated tenant datasets with configurable parameters
- Create tenant-specific Arango smartgraphs
- Validate complete data isolation between tenants
- Demonstrate scalable tenant provisioning and horizontal scale-out
- Implement automated temporal data lifecycle management

## Current State Analysis

### Existing Architecture
- Single-tenant data generator creating JSON files for Arango import
- Collections: Device, DeviceIn, DeviceOut, Location, Software
- Edge Collections: hasConnection, hasLocation, hasSoftware, version
- Proxy pattern for device versioning with temporal data

### Limitations
- No tenant isolation mechanism
- Hard-coded collection names
- Shared data structures across all generated data
- No tenant management utilities

## 3. Key Requirements

### 3.1 Data Generation

The `scalable-multi-tenant-temporal-graph-reference-implementation` repository provides comprehensive reference architecture patterns including data generation, deployment automation, and interactive demonstrations:

* **Tenant-Specific Data:** The script must generate distinct, partitioned data sets for multiple tenants. Each tenant's data will be part of its own disjoint smartgraph.

* **Temporal Fields:** Ensure the data includes consistent temporal attributes for time travel and TTL lifecycle management. **As implemented:** each document carries `created` (when this version became active), `expired` (when superseded; `NEVER_EXPIRES` for current versions), and `ttlExpireAt` (TTL index target for historical records).

* **Vertex-Centric Indexing:** The generated edge documents must include `_fromType` and `_toType` attributes to enable efficient vertex-centric indexing. This is crucial for optimizing queries related to specific asset types.

* **Increased Data Size:** The default data generation size must be increased by a factor of 10 to 100 times to provide a substantial dataset for the scale-out demo.

### 3.2 Graph & Index Requirements

The database schema and indexing strategy must be designed for performance and lifecycle management.

* **Disjoint Smartgraphs:** The data will be loaded into one or more **disjoint smartgraphs**. Each graph will be configured to represent a separate tenant, with its own independent `smartGraphAttribute`.

* **Time Travel Blueprint:** The graph model must adhere to the time travel blueprint where temporal observations are stored as vertices, and edges connect these observations to the assets they describe.

* **TTL Indexes:** A TTL index must be created on the temporal attribute of the collections containing observed data. This index will automatically expire documents after a defined period. The `expireAfterSeconds` value will be managed by the demo automation scripts.

* **Vertex-Centric Indexes:** To optimize graph traversals and queries, the following vertex-centric indexes must be created on edge collections:
  * An index on `(_from, _toType)`.
  * An index on `(_to, _fromType)`.

* **Indexes for Time Travel Queries:** To optimize the retrieval of temporal data and enable fast time-slice queries, the following indexes are required:
  * **Hash Index:** A hash index on the document `_key` is necessary for quick lookups of specific observations.
  * **Temporal Range Index:** An MDI-prefixed index on the temporal attributes (`created`, `expired`) of the observation vertices is crucial for efficiently filtering data within a specific time range. This allows queries to quickly find all observations active at a given point in time or over a period.
  * **Edge Indexing:** The vertex-centric indexes on edge collections (`_from`, `_toType`) and (`_to`, `_fromType`) are also critical for time travel queries, as they significantly speed up traversals from an asset to its temporal observations.

* **Satellite Graph for Device Taxonomy:** A device taxonomy will be created as a **satellite graph**. Each device instance will be connected to its device model via a `'type'` edge. The taxonomy itself will be a hierarchy defined by `'subClassOf'` relationships. As a satellite graph, this metagraph will be replicated to all database servers, providing low-latency, local access to the schema metadata for all disjoint smartgraph tenants.

### 3.3 Demo Automation

A series of scripts must be developed to manage the entire demo lifecycle. These scripts will interact with the Arango cluster management APIs.

## Detailed Functional Requirements

#### FR1: Tenant Data Model
- **FR1.1**: Each tenant must have a unique identifier (UUID or string-based)
- **FR1.2**: All generated data must include tenant context
- **FR1.3**: Tenant isolation must be enforced at the data level. **As implemented:** shared collection names with `tenantId` SmartGraph attribute for disjoint partitioning (preferred over per-tenant collection names for operational simplicity).
- **FR1.4**: Edge references must resolve correctly within each tenant's data partition

#### FR2: Data Generation
- **FR2.1**: Generate isolated datasets for multiple tenants
- **FR2.2**: Support configurable parameters per tenant (device count, locations, etc.)
- **FR2.3**: Maintain existing data quality and relationships within each tenant
- **FR2.4**: Generate tenant-specific JSON files for Arango import
- **FR2.5**: Include temporal attributes (`created`, `expired`, `ttlExpireAt`) in all generated data
- **FR2.6**: Add `_fromType` and `_toType` attributes to edge documents for vertex-centric indexing
- **FR2.7**: Increase default data generation size by 10-100x for scale-out demonstrations
- **FR2.8**: Generate continuous "keep-alive" data streams for ongoing demo operations
- **FR2.9**: Support dual naming conventions (camelCase default, snake_case alternative) configurable per tenant

#### FR3: SmartGraph Configuration
- **FR3.1**: Create disjoint smartgraph definitions for each tenant
- **FR3.2**: Generate Arango setup scripts for tenant provisioning
- **FR3.3**: Support tenant graph creation and deletion
- **FR3.4**: Validate smartgraph disjoint properties
- **FR3.5**: Implement time travel blueprint graph model with temporal observations as vertices
- **FR3.6**: Create satellite graph for device taxonomy with global replication
- **FR3.7**: Configure SmartGraph attribute for tenant isolation. **As implemented:** all tenants share a unified `tenantId` attribute with isolation via data values.

#### FR4: Tenant Management
- **FR4.1**: Utilities for creating new tenants
- **FR4.2**: Tenant metadata management
- **FR4.3**: Bulk tenant data generation capabilities
- **FR4.4**: Tenant cleanup and deletion utilities
- **FR4.5**: Automated cluster provisioning and management
- **FR4.6**: Horizontal scale-out demonstration with new database server addition
- **FR4.7**: Tenant data rebalancing across cluster nodes

#### FR5: Temporal Data Management
- **FR5.1**: Implement TTL indexes on temporal attributes for automatic data expiration
- **FR5.2**: Configurable `expireAfterSeconds` values managed by automation scripts
- **FR5.3**: Time travel query optimization with appropriate indexing
- **FR5.4**: Temporal data lifecycle management and cleanup

#### FR6: Index Optimization
- **FR6.1**: Create vertex-centric indexes on `(_from, _toType)` and `(_to, _fromType)`
- **FR6.2**: Implement hash indexes on document `_key` for quick lookups
- **FR6.3**: Create temporal range indexes on observation timestamps
- **FR6.4**: Optimize edge indexing for time travel query performance
- **FR6.5**: Ensure index configuration and processing logic consistency (config type must match code conditions)

### Non-Functional Requirements

#### NFR1: Performance
- **NFR1.1**: Data generation must scale linearly with tenant count
- **NFR1.2**: Memory usage must remain reasonable for large tenant datasets
- **NFR1.3**: File I/O operations must be optimized for bulk generation
- **NFR1.4**: Horizontal scale-out must demonstrate improved performance with additional nodes
- **NFR1.5**: TTL index operations must not impact query performance
- **NFR1.6**: Time travel queries must execute efficiently with proper indexing

#### NFR2: Data Integrity
- **NFR2.1**: Complete isolation between tenant datasets
- **NFR2.2**: Referential integrity within each tenant's data
- **NFR2.3**: Consistent data formats across all tenants

#### NFR3: Maintainability
- **NFR3.1**: Clean separation between tenant-aware and core generation logic
- **NFR3.2**: Configurable parameters via external configuration
- **NFR3.3**: Comprehensive logging and error handling

#### NFR4: Code Quality and Consistency
- **NFR4.1**: Index configuration changes must include corresponding logic updates
- **NFR4.2**: Configuration-driven features require validation that config types match processing logic
- **NFR4.3**: Breaking changes to data structures must include comprehensive testing of dependent code

## Technical Architecture

### Tenant Identification Strategy
- **Format**: `tenant_{uuid}` or configurable string identifiers
- **Scope**: All collections, edges, and file names include tenant context
- **Metadata**: Tenant configuration stored separately from generated data

### Naming Convention Support

The system supports **dual naming conventions** to accommodate different organizational preferences and technical requirements:

#### Default: camelCase (W3C OWL Compliant)
Following W3C OWL standards for professional data modeling:

**Vertex Collections**
- **Format**: PascalCase, singular form
- **Examples**: `Device`, `Location`, `Software`, `DeviceProxyIn`, `DeviceProxyOut`
- **Rationale**: Represents entity classes/types in RDF ontologies

**Edge Collections**  
- **Format**: camelCase, singular form
- **Examples**: `hasConnection`, `hasLocation`, `hasDeviceSoftware`, `hasVersion`
- **Rationale**: Represents predicates/relationships in RDF ontologies

**Property Names**
- **Single Values**: camelCase, singular form
  - Examples: `deviceType`, `ipAddress`, `macAddress`, `serialNumber`
- **Lists/Arrays**: camelCase, plural form  
  - Examples: `firewallRules`, `configurationHistory`, `edgeDefinitions`
- **Sub-documents**: camelCase, singular form
  - Examples: `location` (GeoJSON), `softwareVersion`

#### Alternative: snake_case (Technical/Database Standard)
For organizations preferring database-friendly naming:

**Vertex Collections**
- **Format**: snake_case, singular form
- **Examples**: `device`, `location`, `software`, `device_proxy_in`, `device_proxy_out`
- **Rationale**: Consistent with SQL database conventions

**Edge Collections**
- **Format**: snake_case, singular form
- **Examples**: `has_connection`, `has_location`, `has_device_software`, `has_version`
- **Rationale**: Readable and consistent with technical documentation

**Property Names**
- **Single Values**: snake_case, singular form
  - Examples: `device_type`, `ip_address`, `mac_address`, `serial_number`
- **Lists/Arrays**: snake_case, plural form
  - Examples: `firewall_rules`, `configuration_history`, `edge_definitions`
- **Sub-documents**: snake_case, singular form
  - Examples: `location_data`, `software_version`

#### Convention Selection
- **Default**: camelCase (automatically applied unless specified otherwise)
- **Configuration**: Selectable via `NamingConvention.CAMEL_CASE` or `NamingConvention.SNAKE_CASE`
- **Consistency**: Once selected, the convention applies to all collections, properties, and files within a tenant
- **Isolation**: Different tenants can use different naming conventions simultaneously

#### Collection Naming Examples

**camelCase (Default)**
```
# Vertex Collections
Device (tenant-scoped via smartGraph attribute)
DeviceProxyIn (tenant-scoped via smartGraph attribute)  
DeviceProxyOut (tenant-scoped via smartGraph attribute)
Location (tenant-scoped via smartGraph attribute)
Software (tenant-scoped via smartGraph attribute)
SoftwareProxyIn (tenant-scoped via smartGraph attribute)
SoftwareProxyOut (tenant-scoped via smartGraph attribute)

# Edge Collections  
hasConnection (tenant-scoped via smartGraph attribute)
hasLocation (tenant-scoped via smartGraph attribute)
hasDeviceSoftware (tenant-scoped via smartGraph attribute)
hasVersion (tenant-scoped via smartGraph attribute)
```

**snake_case (Alternative)**
```
# Vertex Collections
device (tenant-scoped via smartGraph attribute)
device_proxy_in (tenant-scoped via smartGraph attribute)
device_proxy_out (tenant-scoped via smartGraph attribute)
location (tenant-scoped via smartGraph attribute)
software (tenant-scoped via smartGraph attribute)
software_proxy_in (tenant-scoped via smartGraph attribute)
software_proxy_out (tenant-scoped via smartGraph attribute)

# Edge Collections
has_connection (tenant-scoped via smartGraph attribute)
has_location (tenant-scoped via smartGraph attribute)
has_device_software (tenant-scoped via smartGraph attribute)
has_version (tenant-scoped via smartGraph attribute)
```

### File Structure

**camelCase (Default)**
```
data/
|-- tenant_{tenant_id}/
|   |-- Device.json
|   |-- DeviceProxyIn.json
|   |-- DeviceProxyOut.json
|   |-- Location.json
|   |-- Software.json
|   |-- SoftwareProxyIn.json
|   |-- SoftwareProxyOut.json
|   |-- hasConnection.json
|   |-- hasLocation.json
|   |-- hasDeviceSoftware.json
|   +-- hasVersion.json
+-- tenant_registry_time_travel.json (tenant metadata)
```

**snake_case (Alternative)**
```
data/
|-- tenant_{tenant_id}/
|   |-- device.json
|   |-- device_proxy_in.json
|   |-- device_proxy_out.json
|   |-- location.json
|   |-- software.json
|   |-- software_proxy_in.json
|   |-- software_proxy_out.json
|   |-- has_connection.json
|   |-- has_location.json
|   |-- has_device_software.json
|   +-- has_version.json
+-- tenant_registry_time_travel.json (tenant metadata)
```

### SmartGraph Definition
Each tenant will have a disjoint smartgraph with:
- **Graph Name**: `tenant_{tenant_id}_network_assets`
- **Vertex Collections**: All tenant-scoped vertex collections
- **Edge Definitions**: All tenant-scoped edge collections with proper from/to mappings
- **Disjoint Property**: Ensures complete isolation between tenant graphs

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Design tenant data model and configuration system
2. Core generator functions accept tenant context
3. Implement tenant-aware collection and file naming
4. Create tenant metadata management

### Phase 2: Infrastructure (Week 3-4)
5. Generate Arango smartgraph configuration scripts
6. Implement tenant provisioning utilities
7. Create bulk tenant data generation
8. Add data validation and integrity checks

### Phase 3: Validation (Week 5)
9. Comprehensive testing of tenant isolation
10. Performance testing with multiple tenants
11. Documentation and deployment guides

## Acceptance Criteria

### Data Generation
- [x] Generate isolated datasets for configurable number of tenants
- [x] Each tenant has complete set of network asset data
- [x] No cross-tenant data references or contamination
- [x] Configurable parameters per tenant (devices, locations, software)
- [x] Support both camelCase (default) and snake_case naming conventions
- [x] Naming convention consistency within each tenant

### SmartGraph Integration
- [x] Generate valid Arango smartgraph definitions
- [x] Create tenant-specific database setup scripts
- [x] Validate disjoint smartgraph properties
- [ ] Support tenant graph lifecycle management (partial - creation done, deletion pending)

### Data Isolation
- [x] Complete separation of tenant data in all collections
- [x] Tenant isolation via shared collections with tenantId SmartGraph attribute
- [x] Isolated file storage per tenant
- [x] No shared references between tenant datasets

### Management Utilities
- [x] Tenant creation scripts
- [x] Bulk tenant data generation
- [x] Tenant metadata management
- [x] Data validation and integrity checks (30/30 tests passing)
- [ ] Tenant deletion utilities (pending)

### Code Quality and Consistency
- [x] Index configuration types match processing logic conditions
- [x] All configured index types are successfully created (no "Unknown index type" errors)
- [x] Configuration changes include corresponding implementation updates

## Risks and Mitigation

### Risk 1: Data Contamination
- **Risk**: Accidental cross-tenant data references
- **Mitigation**: Comprehensive validation scripts and automated testing

### Risk 2: Performance Degradation
- **Risk**: Poor performance with large numbers of tenants
- **Mitigation**: Optimize data generation algorithms and file I/O operations

### Risk 3: Configuration Complexity
- **Risk**: Complex configuration management for multiple tenants
- **Mitigation**: Clear configuration schema and validation

## Success Metrics

- **Isolation Completeness**: 100% isolation between tenant datasets
- **Generation Performance**: Linear scaling with tenant count
- **Data Integrity**: Zero cross-tenant references
- **Setup Time**: < 5 minutes for new tenant provisioning
- **Scale-out Performance**: Measurable performance improvement with cluster expansion
- **Temporal Data Management**: Automatic TTL-based data expiration working correctly
- **Query Performance**: Time travel queries executing within acceptable performance thresholds
- **Automation Coverage**: 100% automated demo lifecycle from provisioning to cleanup

## Timeline

- **Week 1-2**: Foundation and core implementation
- **Week 3-4**: Infrastructure and utilities
- **Week 5**: Testing and validation
- **Week 6**: Documentation and final integration

## Dependencies

- Arango cluster with smartgraph and disjoint smartgraph support
- Arango cluster management APIs for automation
- Python environment with existing dependencies (geojson, uuid, datetime)
- File system access for tenant-specific data storage
- Configuration management system for tenant and cluster parameters
- TTL index support in Arango
- Satellite graph capability for device taxonomy replication

## 6. Alert Management System (NEW)

### 6.1 Alert System Requirements

The reference implementation will be enhanced with a comprehensive alert management system that demonstrates real-time monitoring capabilities integrated with the temporal graph architecture.

#### Alert Sources
- **Device-Generated Alerts**: Hardware failures, connectivity issues, performance thresholds, security events
- **Software-Generated Alerts**: Application crashes, service unavailability, performance degradation, security vulnerabilities

#### Alert Architecture
- **Alert Collection**: Vertex collection containing alert events with TTL management
- **hasAlert Relationships**: Edge collection connecting DeviceProxyOut/SoftwareProxyOut to Alert entities
- **Event-Based Design**: Alerts are events (not configurations), no time travel versioning needed
- **TTL Lifecycle**: Active alerts (no TTL) -> Resolved alerts (TTL-enabled for automatic cleanup)

#### Alert Data Model
```
Alert (Vertex Collection):
- name: Concise label for graph visualization (e.g., "Critical Hardware: Router")
- alertType: "hardware", "software", "security", "performance", "connectivity"
- severity: "critical", "warning", "info"
- status: "active", "acknowledged", "resolved"
- message: Human-readable alert description
- created/expired: Timestamp fields for lifecycle management
- ttlExpireAt: TTL field for resolved alert cleanup (30 days)
- metadata: JSON object with alert-specific data
- tenantId: Multi-tenant isolation identifier

hasAlert (Edge Collection):
- _from: DeviceProxyOut/_key OR SoftwareProxyOut/_key
- _to: Alert/_key
- created/expired: Timestamp fields for relationship lifecycle
- ttlExpireAt: TTL field for relationship cleanup
- relationshipType: "generated_by"
- tenantId: Multi-tenant isolation identifier
```

#### Alert Simulation Capabilities
- **Real-time Alert Generation**: Simulate device and software alerts during demonstrations
- **Alert Resolution Workflows**: Demonstrate alert lifecycle from active to resolved
- **Correlation Queries**: Show related alerts across devices, software, and locations
- **TTL Demonstration**: Watch resolved alerts age out automatically

#### Integration Requirements
- **Multi-Tenant Isolation**: Complete tenant separation for alert data
- **Demo Integration**: Add alert section to automated walkthrough
- **Performance Optimization**: Indexes on alertType, severity, tenantId, status
- **Monitoring Queries**: Real-time alert status and trending capabilities
- **Graph Visualization**: hasAlert edge definition integrated into SmartGraph for complete visualization
- **Name-based Discovery**: Concise alert names enable rapid identification in graph visualizer

#### Implementation Status: [COMPLETE]
- **Alert Generation**: Realistic alerts from DeviceProxyOut and SoftwareProxyOut [COMPLETE]
- **Alert Resolution**: Working lifecycle management with TTL activation [COMPLETE]
- **Graph Integration**: hasAlert edges fully visualizable in Arango Graph Visualizer [COMPLETE]
- **Multi-tenant Support**: Complete tenant isolation for all alert data [COMPLETE]
- **TTL Management**: Resolved alerts automatically age out (demo: 5min, production: 30 days) [COMPLETE]
- **Real-time Simulation**: On-demand alert generation during demonstrations [COMPLETE]
- **Name Properties**: Enhanced visualization with meaningful alert names [COMPLETE]
