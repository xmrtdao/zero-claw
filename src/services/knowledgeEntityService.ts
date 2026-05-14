import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeEntity {
  id: string;
  entityName: string;
  entityType: string;
  description?: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class KnowledgeEntityService {
  private static instance: KnowledgeEntityService;

  public static getInstance(): KnowledgeEntityService {
    if (!KnowledgeEntityService.instance) {
      KnowledgeEntityService.instance = new KnowledgeEntityService();
    }
    return KnowledgeEntityService.instance;
  }

  // Create or update an entity
  public async upsertEntity(
    entityName: string,
    entityType: string,
    description?: string,
    confidenceScore: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('knowledge_entities')
        .select('*')
        .eq('entity_name', entityName)
        .eq('entity_type', entityType)
        .single();

      if (existing) {
        // Update existing entity
        const existingMetadata = existing.metadata as Record<string, any> || {};
        await supabase
          .from('knowledge_entities')
          .update({
            description,
            confidence_score: Math.min(existing.confidence_score + 0.1, 1.0),
            metadata: { ...existingMetadata, ...(metadata || {}) },
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new entity
        await supabase
          .from('knowledge_entities')
          .insert({
            entity_name: entityName,
            entity_type: entityType,
            description,
            confidence_score: confidenceScore,
            metadata: metadata || {}
          });
      }
    } catch (error) {
      console.error('Failed to upsert knowledge entity:', error);
    }
  }

  // Get entities by type
  public async getEntitiesByType(entityType: string): Promise<KnowledgeEntity[]> {
    try {
      const { data, error } = await supabase
        .from('knowledge_entities')
        .select('*')
        .eq('entity_type', entityType)
        .order('confidence_score', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching entities by type:', error);
        return [];
      }

      return data?.map(entity => ({
        id: entity.id,
        entityName: entity.entity_name,
        entityType: entity.entity_type,
        description: entity.description,
        confidenceScore: entity.confidence_score,
        metadata: entity.metadata as Record<string, any>,
        createdAt: new Date(entity.created_at),
        updatedAt: new Date(entity.updated_at)
      })) || [];
    } catch (error) {
      console.error('Failed to get entities by type:', error);
      return [];
    }
  }

  // Search entities
  public async searchEntities(searchTerm: string): Promise<KnowledgeEntity[]> {
    try {
      const { data, error } = await supabase
        .from('knowledge_entities')
        .select('*')
        .or(`entity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('confidence_score', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error searching entities:', error);
        return [];
      }

      return data?.map(entity => ({
        id: entity.id,
        entityName: entity.entity_name,
        entityType: entity.entity_type,
        description: entity.description,
        confidenceScore: entity.confidence_score,
        metadata: entity.metadata as Record<string, any>,
        createdAt: new Date(entity.created_at),
        updatedAt: new Date(entity.updated_at)
      })) || [];
    } catch (error) {
      console.error('Failed to search entities:', error);
      return [];
    }
  }

  // Extract entities from text
  public async extractEntities(text: string): Promise<void> {
    // Simple entity extraction - can be enhanced with NLP
    const entities = [
      { pattern: /mining|hashrate|pool/gi, type: 'mining_concept' },
      { pattern: /dao|governance|voting/gi, type: 'dao_concept' },
      { pattern: /xmrt|monero|xmr/gi, type: 'cryptocurrency' },
      { pattern: /wallet|address|transaction/gi, type: 'blockchain_concept' }
    ];

    for (const { pattern, type } of entities) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          await this.upsertEntity(match.toLowerCase(), type, `Extracted from conversation`);
        }
      }
    }
  }
}

export const knowledgeEntityService = KnowledgeEntityService.getInstance();
