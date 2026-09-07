import type { TemplateId } from '../domain/committ';
import { CommittError } from '../agent/errors';

export interface AuditedTemplate {
  id: TemplateId;
  name: string;
  description: string;
  auditStatus: 'internal-review';
  version: string;
  capabilities: string[];
  risks: string[];
  sourcePath: string;
}

const templates: Record<TemplateId, AuditedTemplate> = {
  'tip-jar': {
    id: 'tip-jar',
    name: 'SOL tip jar',
    description: 'Accept voluntary SOL tips into a repository-specific vault controlled by the developer.',
    auditStatus: 'internal-review',
    version: '0.1.0',
    capabilities: [
      'Create one campaign PDA for a repository',
      'Accept SOL tips from any signer',
      'Allow only the recorded authority to withdraw',
    ],
    risks: [
      'Program source requires an independent audit before mainnet.',
      'Devnet SOL has no monetary value.',
      'The authority wallet is solely responsible for withdrawals.',
    ],
    sourcePath: 'programs/committ-tip-jar',
  },
};

export function getTemplate(id: TemplateId): AuditedTemplate {
  const template = templates[id];
  if (!template) {
    throw new CommittError('UNKNOWN_TEMPLATE', 'That deployment template is not available.');
  }
  return template;
}

export function listTemplates(): AuditedTemplate[] {
  return Object.values(templates);
}
