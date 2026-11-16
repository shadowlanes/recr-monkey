import { Router, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { resolvePrincipal } from '../principal';
import { buildMcpServer } from './server';

export const mcpRouter = Router();

const rpcError = (code: number, message: string) => ({
  jsonrpc: '2.0' as const,
  id: null,
  error: { code, message },
});

// Stateless Streamable HTTP: a fresh server and transport per request, so
// there is no session store and restarts lose nothing.
mcpRouter.post('/', async (req: Request, res: Response) => {
  let principal = null;
  try {
    principal = await resolvePrincipal(req.headers);
  } catch (error) {
    console.error('MCP auth error:', error);
  }

  // Cookie sessions are refused on purpose: with bearer-only auth there is
  // no ambient credential for another site to ride on.
  if (!principal || principal.via === 'session') {
    const base = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
    res.setHeader(
      'WWW-Authenticate',
      `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
    );
    return res
      .status(401)
      .json(rpcError(-32000, 'Unauthorized: send an API key or OAuth token as a Bearer token'));
  }

  const server = buildMcpServer(principal);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json(rpcError(-32603, 'Internal server error'));
    }
  }
});

// Nothing to stream and no session to end on a stateless server.
const methodNotAllowed = (_req: Request, res: Response) =>
  res.status(405).set('Allow', 'POST').json(rpcError(-32000, 'Method not allowed'));

mcpRouter.get('/', methodNotAllowed);
mcpRouter.delete('/', methodNotAllowed);
