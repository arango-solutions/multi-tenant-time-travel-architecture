# Device/Software Taxonomy Implementation Plan

## Overview
Add formal taxonomy support to the multi-tenant temporal graph with `Class` entities and semantic relationships.

## Schema Design

### New Collections

#### 1. Class Collection
```json
{
  "_key": "class_router_001",
  "_id": "Class/class_router_001", 
  "tenantId": "shared_taxonomy",  // Shared across tenants or tenant-specific
  "name": "Router",
  "description": "Network routing device",
  "category": "NetworkDevice",
  "properties": {
    "hasPortCount": true,
    "hasRoutingTable": true,
    "supportedProtocols": ["BGP", "OSPF", "RIP"]
  },
  "created": 1729123456,
  "expired": 9223372036854775807  // Current taxonomy classes never expire
}
```

#### 2. type Edge Collection
```json
{
  "_key": "type_device_router_001", 
  "_id": "type/type_device_router_001",
  "_from": "Device/tenant_123_device1-0",
  "_to": "Class/class_router_001",
  "tenantId": "tenant_123",
  "relationshipType": "instanceOf",
  "confidence": 1.0,  // Classification confidence
  "created": 1729123456,
  "expired": 9223372036854775807
}
```

#### 3. subClassOf Edge Collection  
```json
{
  "_key": "subclass_edge_router_001",
  "_id": "subClassOf/subclass_edge_router_001", 
  "_from": "Class/class_edge_router_001",
  "_to": "Class/class_router_001",
  "tenantId": "shared_taxonomy",
  "relationshipType": "inheritance",
  "created": 1729123456,
  "expired": 9223372036854775807
}
```

## Implementation Phases

### Phase 1: Schema & Configuration Updates

**Files to Modify:**
- `src/config/config_management.py` - Add new collections
- `src/config/tenant_config.py` - Add taxonomy edge definitions  
- `src/database/database_deployment.py` - Create new collections
- `src/ttl/ttl_config.py` - Add TTL configurations

**New Collections:**
- `Class` (vertex)
- `type` (edge: Device/Software -> Class)
- `subClassOf` (edge: Class -> Class)

### Phase 2: Taxonomy Data Generation

**New Files to Create:**
- `src/data_generation/taxonomy_generator.py` - Generate class hierarchies
- `src/data_generation/taxonomy_config.py` - Taxonomy definitions
- `src/config/taxonomy_constants.py` - Taxonomy constants

**Taxonomy Hierarchies:**

#### Device Taxonomy
```
NetworkDevice
|-- Router
|   |-- EdgeRouter
|   |-- CoreRouter
|   +-- WirelessRouter
|-- Switch
|   |-- L2Switch
|   |-- L3Switch
|   +-- ManagedSwitch
|-- AccessPoint
|   |-- IndoorAP
|   +-- OutdoorAP
|-- Firewall
|   |-- NextGenFirewall
|   +-- StatefulFirewall
+-- LoadBalancer
    |-- ApplicationLB
    +-- NetworkLB
```

#### Software Taxonomy
```
Software
|-- Database
|   |-- RelationalDB
|   |   |-- PostgreSQL
|   |   |-- MySQL
|   |   +-- Oracle
|   +-- NoSQLDB
|       |-- DocumentDB (MongoDB)
|       |-- KeyValueDB (Redis)
|       +-- GraphDB (Neo4j, Arango)
|-- WebServer
|   |-- Apache
|   |-- Nginx
|   +-- IIS
|-- OperatingSystem
|   |-- Linux
|   |   |-- Ubuntu
|   |   |-- CentOS
|   |   +-- RedHat
|   +-- Windows
|       |-- WindowsServer
|       +-- Windows10
|-- ApplicationServer
|   |-- Tomcat
|   |-- JBoss
|   +-- WebLogic
+-- Monitoring
    |-- Prometheus
    |-- Grafana
    +-- Nagios
```

### Phase 3: Data Generation Integration

**Files to Modify:**
- `src/data_generation/asset_generator.py` - Integrate taxonomy generation
- `src/data_generation/data_generation_utils.py` - Add taxonomy utilities

**Process:**
1. Generate Class hierarchy first
2. Generate Device/Software instances
3. Create `type` edges linking instances to classes
4. Ensure multi-tenant isolation for instance data
5. Share taxonomy classes across tenants (configurable)

### Phase 4: Query & Demo Integration

**Files to Modify:**
- `demos/automated_demo_walkthrough.py` - Add taxonomy queries
- `src/validation/test_suite.py` - Add taxonomy tests

**New Query Examples:**
```aql
// Find all devices of a specific type
FOR d IN Device
  FOR c IN 1..1 OUTBOUND d type
  FILTER c.name == "Router"
  RETURN {device: d.name, type: c.name}

// Find device hierarchy (device -> class -> superclass)
FOR d IN Device
  FOR c IN 1..1 OUTBOUND d type
  FOR sc IN 0..5 OUTBOUND c subClassOf
  RETURN {
    device: d.name,
    directType: c.name, 
    hierarchy: sc.name
  }

// Find all software in a category
FOR s IN Software  
  FOR c IN 1..1 OUTBOUND s type
  FOR sc IN 0..5 OUTBOUND c subClassOf
  FILTER sc.name == "Database"
  RETURN {software: s.name, type: c.name}

// Multi-tenant taxonomy query
FOR d IN Device
  FILTER d.tenantId == @tenantId
  FOR c IN 1..1 OUTBOUND d type  
  FOR sc IN 0..3 OUTBOUND c subClassOf
  COLLECT category = sc.name WITH COUNT INTO deviceCount
  RETURN {category: category, count: deviceCount}
```

### Phase 5: Visualization & Graph Updates

**Files to Modify:**
- Graph definitions to include new collections
- Update visualizer start sets to include taxonomy
- Add taxonomy-based filtering capabilities

## Technical Considerations

### Multi-Tenancy Strategy
**Option A: Shared Taxonomy**
- Single taxonomy shared across all tenants
- `Class` collection has `tenantId: "shared"`
- `type` edges are tenant-specific
- Pro: Consistency, easier maintenance
- Con: Less flexibility per tenant

**Option B: Tenant-Specific Taxonomy** 
- Each tenant can have custom taxonomy
- `Class` collection partitioned by `tenantId`
- Full isolation including taxonomy
- Pro: Maximum flexibility
- Con: More complex, potential inconsistency

**Recommendation: Hybrid Approach**
- Core taxonomy shared (`tenantId: "shared"`)
- Allow tenant-specific extensions
- Use inheritance to extend shared classes

### Temporal Considerations
- Taxonomy classes typically don't expire (`expired: NEVER_EXPIRES`)
- `type` relationships can change over time (device reclassification)
- `subClassOf` relationships are usually stable
- Support for taxonomy evolution over time

### Performance Optimization
- Index on `Class.name` and `Class.category`
- Index on `type._from` and `type._to`
- Consider MDI indexes for taxonomy traversals
- Cache frequently used taxonomy queries

## Implementation Order

1. **Schema Setup** (1-2 hours)
   - Update configuration files
   - Add new collections to database deployment

2. **Taxonomy Generation** (3-4 hours)
   - Create taxonomy generator
   - Define device/software hierarchies
   - Implement class and edge generation

3. **Integration** (2-3 hours)  
   - Integrate with existing data generation
   - Update asset generator to use taxonomy

4. **Demo Integration** (1-2 hours)
   - Add taxonomy queries to walkthrough
   - Update visualization guidance

5. **Testing & Validation** (1-2 hours)
   - Add taxonomy tests
   - Validate multi-tenant isolation
   - Test query performance

## Success Criteria

- [ ] Class hierarchy generated correctly
- [ ] Device/Software instances linked to appropriate classes
- [ ] Multi-tenant isolation maintained
- [ ] Taxonomy queries perform efficiently  
- [ ] Demo walkthrough includes taxonomy examples
- [ ] All existing functionality remains intact
- [ ] Tests pass with taxonomy integration

## Future Enhancements

- **Dynamic Classification**: ML-based device/software classification
- **Taxonomy Versioning**: Support for taxonomy evolution
- **Custom Properties**: Class-specific property validation
- **Inference Rules**: Automatic classification based on properties
- **Taxonomy Import/Export**: Standard formats (OWL, SKOS)

## Files to Create/Modify

### New Files
- `src/data_generation/taxonomy_generator.py`
- `src/data_generation/taxonomy_config.py` 
- `src/config/taxonomy_constants.py`
- `docs/TAXONOMY_SCHEMA.md`

### Modified Files
- `src/config/config_management.py`
- `src/config/tenant_config.py`
- `src/database/database_deployment.py`
- `src/ttl/ttl_config.py`
- `src/data_generation/asset_generator.py`
- `demos/automated_demo_walkthrough.py`
- `src/validation/test_suite.py`

This taxonomy enhancement will significantly increase the semantic richness of the network asset management system while maintaining all existing functionality and multi-tenant isolation.
