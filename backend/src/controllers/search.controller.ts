import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import { successResponse } from '../utils/response.util';
import { semanticSearchService } from '../services/search/semantic-search.service';
import { embeddingProvider } from '../services/embedding';

/* ---------- SEMANTIC SEARCH (Phase 2 · P4) ---------- */
// Any authenticated user. Empty results when EMBED_PROVIDER=noop.
export const searchSemantic = async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const limitParam = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(limitParam) ? limitParam : 10;
  const deptRaw = req.query.departmentId;
  const departmentId = typeof deptRaw === 'string' && /^\d+$/.test(deptRaw) ? Number(deptRaw) : undefined;

  const hits = await semanticSearchService.searchPosts({ query: q, limit, departmentId });
  return successResponse(res, 'Semantic search complete', {
    enabled: embeddingProvider.enabled,
    hits,
  });
};

export const searchSimilarToPost = async (req: Request, res: Response) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    throw new AppError('Invalid post ID', StatusCodes.BAD_REQUEST, 'INVALID_ID');
  }
  const hits = await semanticSearchService.findSimilarByPostId(postId, 5);
  return successResponse(res, 'Similar posts', {
    enabled: embeddingProvider.enabled,
    hits,
  });
};
