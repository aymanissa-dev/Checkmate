import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

// Centipawn material values.
const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (white's perspective, a8..h1 reading order).
// Encourage sensible development, central control and king safety.
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
  20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10,
  0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
];
const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
  0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20,
  15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
  10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0,
  -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10,
  -10, -10, -10, -10, -10, -20,
];
const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0,
  -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0,
  -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
];
const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
  5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5,
  5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10,
  -20,
];
const KING_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
  -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
  -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
  -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
];

const PST: Record<PieceSymbol, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Map an algebraic square (e.g. "e4") to a 0..63 index in a8..h1 reading order.
function squareToIndex(square: Square): number {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  return (8 - rank) * 8 + file;
}

// Static evaluation of a position, in centipawns, from White's perspective.
function evaluate(game: Chess): number {
  if (game.isCheckmate()) {
    // Side to move is checkmated -> very bad for them.
    return game.turn() === 'w' ? -Infinity : Infinity;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const index = r * 8 + f;
      const base = PIECE_VALUE[piece.type];
      // White reads the table directly; Black mirrors it vertically.
      const positional =
        piece.color === 'w' ? PST[piece.type][index] : PST[piece.type][63 - index];
      const value = base + positional;
      score += piece.color === 'w' ? value : -value;
    }
  }
  return score;
}

// Order moves so captures and promotions are searched first (better pruning).
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => moveScore(b) - moveScore(a));
}

function moveScore(move: Move): number {
  let score = 0;
  if (move.captured) {
    score += 10 * PIECE_VALUE[move.captured] - PIECE_VALUE[move.piece];
  }
  if (move.promotion) {
    score += PIECE_VALUE[move.promotion];
  }
  return score;
}

// Negamax with alpha-beta pruning. Returns the score from White's perspective.
function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game);
  }

  const maximizing = game.turn() === 'w';
  const moves = orderMoves(game.moves({ verbose: true }));

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, search(game, depth - 1, alpha, beta));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.move(move);
    best = Math.min(best, search(game, depth - 1, alpha, beta));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export interface BestMoveOptions {
  /** Search depth in plies. Higher is stronger but slower. */
  depth?: number;
}

/**
 * Choose the best move for the side to move in the given position.
 * Returns the chosen verbose move, or null if the game is already over.
 */
export function findBestMove(fen: string, options: BestMoveOptions = {}): Move | null {
  const depth = options.depth ?? 3;
  const game = new Chess(fen);
  if (game.isGameOver()) return null;

  const color: Color = game.turn();
  const moves = orderMoves(game.moves({ verbose: true }));
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = color === 'w' ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const score = search(game, depth - 1, -Infinity, Infinity);
    game.undo();

    if (color === 'w' ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export { squareToIndex };
