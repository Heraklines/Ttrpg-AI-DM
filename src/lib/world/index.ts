export { tensionExtractor, TensionExtractor } from './tension-extractor';
export type { CoreTension, TensionSide, WorldSeedData } from './tension-extractor';

export { coherenceChecker, CoherenceChecker } from './coherence-checker';
export type { CoherenceIssue, CoherenceReport } from './coherence-checker';

export { relationshipService, RelationshipService } from './relationship-service';
export type { 
  EntityType, 
  RelationshipType, 
  CreateRelationshipParams,
  GeneratedRelationship,
  GraphNode,
  GraphEdge,
  GraphData 
} from './relationship-service';

export { discoveryService, DiscoveryService } from './discovery-service';
export type { DiscoveryLevel, DiscoveryState, DiscoveredEntity } from './discovery-service';
