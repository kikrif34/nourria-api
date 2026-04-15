export const mockCallClaude = jest.fn();
export const mockCallClaudeVision = jest.fn();
export const mockParseClaudeJson = jest.fn();

jest.mock('../utils/claude', () => ({
  callClaude: mockCallClaude,
  callClaudeVision: mockCallClaudeVision,
  parseClaudeJson: mockParseClaudeJson,
}));

export const mockFrom = jest.fn();

jest.mock('../utils/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({ from: mockFrom })),
}));
