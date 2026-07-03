import prisma from '../../config/db';
import { AppError } from '../../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { config } from '../../config/env.config';
import Groq from 'groq-sdk';
import { logger } from '../../infrastructure/observability/logger';

let _groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
  if (!_groq) _groq = new Groq({ apiKey: config.GROQ_API_KEY });
  return _groq;
}

export interface DuplicateCheckResult {
  found: boolean;
  match?: {
    postNumber: string | null;
    title: string;
    resolution: string | null;
    url: string;
    id: number;
  };
}

export class DuplicateCheckService {
  public async checkForDuplicates(title: string, body?: string): Promise<DuplicateCheckResult> {
    // 1. Initial rough search using Postgres Full Text Search (similar to FeedSearch)
    const formattedSearch = title.trim().split(/\s+/).join(' | ');
    
    // We only care about RESOLVED posts for duplicate checking (as they have answers)
    const candidates = await prisma.post.findMany({
      where: {
        status: 'RESOLVED',
        OR: [
          { title: { search: formattedSearch } },
          { description: { search: formattedSearch } }
        ]
      },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        postNumber: true,
        resolution: true,
        comments: {
          where: { isCanonical: true },
          take: 1,
          select: { content: true }
        }
      }
    });

    if (candidates.length === 0) {
      return { found: false };
    }

    // 2. Re-rank and verify using Groq LLM
    try {
      const groq = getGroqClient();
      
      const candidateListString = candidates.map((c, index) => 
        `[ID: ${c.id}] Title: ${c.title}\nDescription: ${c.description.substring(0, 200)}...`
      ).join('\n\n');

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an intelligent duplicate checker for an internal CRM support board.
Given a new user post, compare it against a list of candidate posts that have already been resolved.
Determine if ANY of the candidates are exact semantic duplicates or answer the exact same core question/problem as the new post.

Strictly return JSON only in this format:
{
  "found": boolean,
  "matchId": number | null // The ID of the best duplicate candidate, or null if found is false
}`
          },
          {
            role: 'user',
            content: `New Post Title: ${title}\nNew Post Body: ${body || 'N/A'}\n\nCandidates:\n${candidateListString}`
          }
        ]
      });

      let rawContent = completion.choices?.[0]?.message?.content || '{}';
      rawContent = rawContent.replace(/^```json/m, '').replace(/```$/m, '').trim();
      const result = JSON.parse(rawContent);

      if (result.found && result.matchId) {
        const match = candidates.find(c => c.id === result.matchId);
        if (match) {
          return {
            found: true,
            match: {
              id: match.id,
              postNumber: match.postNumber,
              title: match.title,
              resolution: match.resolution,
              url: `/post/${match.id}`
            }
          };
        }
      }

      return { found: false };
    } catch (err) {
      logger.error({ err }, 'Groq duplicate check failed. Falling back to simple heuristic.');
      // Fallback: If title is an exact match (case insensitive)
      const exactMatch = candidates.find(c => c.title.toLowerCase() === title.toLowerCase());
      if (exactMatch) {
        return {
          found: true,
          match: {
            id: exactMatch.id,
            postNumber: exactMatch.postNumber,
            title: exactMatch.title,
            resolution: exactMatch.resolution,
            url: `/post/${exactMatch.id}`
          }
        };
      }
      return { found: false };
    }
  }
}

export const duplicateCheckService = new DuplicateCheckService();
