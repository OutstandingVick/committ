import { publicError } from '../../../src/agent/errors';
import { prepareDeployment } from '../../../src/agent/tools/prepareDeployment';
import type { TemplateId } from '../../../src/domain/committ';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      analysisId?: string;
      repoUrl?: string;
      template?: TemplateId;
      authority?: string;
      confirmed?: boolean;
    };
    const plan = prepareDeployment({
      analysisId: body.analysisId ?? '',
      repoUrl: body.repoUrl ?? '',
      template: body.template ?? 'tip-jar',
      authority: body.authority,
      confirmed: body.confirmed === true,
      origin: new URL(request.url).origin,
    });
    return Response.json(plan);
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
