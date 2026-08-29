import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { Chess, type Move, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { findBestMove } from './engine';

type Orientation = 'white' | 'black';

const DIFFICULTIES = [
  { label: 'Easy', depth: 1 },
  { label: 'Medium', depth: 2 },
  { label: 'Hard', depth: 3 },
] as const;

// Unicode glyphs for captured-piece display.
const GLYPH: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
};

const PIECE_WEIGHT: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

const HUMAN_COLOR = 'w';

function describeStatus(game: Chess): { text: string; tone: 'normal' | 'good' | 'bad' | 'warn' } {
  if (game.isCheckmate()) {
    const humanWon = game.turn() !== HUMAN_COLOR;
    return {
      text: humanWon ? 'Checkmate — you win! 🏆' : 'Checkmate — the AI wins.',
      tone: humanWon ? 'good' : 'bad',
    };
  }
  if (game.isStalemate()) return { text: 'Stalemate — draw.', tone: 'warn' };
  if (game.isThreefoldRepetition()) return { text: 'Draw by repetition.', tone: 'warn' };
  if (game.isInsufficientMaterial()) return { text: 'Draw — insufficient material.', tone: 'warn' };
  if (game.isDraw()) return { text: 'Draw.', tone: 'warn' };
  if (game.isCheck()) {
    return {
      text: game.turn() === HUMAN_COLOR ? 'You are in check!' : 'AI is in check.',
      tone: 'warn',
    };
  }
  return {
    text: game.turn() === HUMAN_COLOR ? 'Your move (White).' : 'AI is thinking…',
    tone: 'normal',
  };
}

// Captured material for each side, derived from the move history.
function capturedPieces(history: Move[]) {
  const captured = { w: [] as string[], b: [] as string[] };
  for (const move of history) {
    if (!move.captured) continue;
    // The capturing side gains the captured piece (which belonged to the opponent).
    const gainedBy = move.color;
    captured[gainedBy].push(move.captured);
  }
  const score = (pieces: string[]) => pieces.reduce((sum, p) => sum + (PIECE_WEIGHT[p] ?? 0), 0);
  return {
    byWhite: captured.w,
    byBlack: captured.b,
    advantage: score(captured.w) - score(captured.b),
  };
}

export default function App() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [orientation, setOrientation] = useState<Orientation>('white');
  const [depth, setDepth] = useState(2);
  const [thinking, setThinking] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // `fen` state drives re-renders; these derived values are cheap to recompute.
  const game = gameRef.current;
  void fen;
  const history = game.history({ verbose: true }) as Move[];
  const status = describeStatus(game);
  const captured = capturedPieces(history);

  const sync = useCallback(() => {
    setFen(gameRef.current.fen());
  }, []);

  const playAiMove = useCallback(() => {
    const current = gameRef.current;
    if (current.isGameOver() || current.turn() === HUMAN_COLOR) return;
    setThinking(true);
    // Defer so the UI can paint the "thinking" state before the search blocks.
    window.setTimeout(() => {
      const best = findBestMove(current.fen(), { depth });
      if (best) {
        current.move(best);
        setLastMove({ from: best.from, to: best.to });
      }
      setThinking(false);
      sync();
    }, 250);
  }, [depth, sync]);

  const attemptMove = useCallback(
    (from: Square, to: Square): boolean => {
      const current = gameRef.current;
      if (current.turn() !== HUMAN_COLOR || current.isGameOver()) return false;
      try {
        const move = current.move({ from, to, promotion: 'q' });
        setLastMove({ from: move.from, to: move.to });
        setSelected(null);
        sync();
        playAiMove();
        return true;
      } catch {
        return false;
      }
    },
    [playAiMove, sync],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!targetSquare) return false;
      return attemptMove(sourceSquare as Square, targetSquare as Square);
    },
    [attemptMove],
  );

  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      const sq = square as Square;
      const current = gameRef.current;
      if (current.turn() !== HUMAN_COLOR || current.isGameOver()) return;

      if (selected) {
        if (attemptMove(selected, sq)) return;
      }
      const piece = current.get(sq);
      if (piece && piece.color === HUMAN_COLOR) {
        setSelected(sq);
      } else {
        setSelected(null);
      }
    },
    [attemptMove, selected],
  );

  const newGame = useCallback(() => {
    gameRef.current = new Chess();
    setSelected(null);
    setLastMove(null);
    setThinking(false);
    setFen(gameRef.current.fen());
  }, []);

  const undo = useCallback(() => {
    const current = gameRef.current;
    if (thinking) return;
    // Undo the AI reply and the player's move so it's the human's turn again.
    current.undo();
    current.undo();
    setSelected(null);
    setLastMove(null);
    sync();
  }, [sync, thinking]);

  const squareStyles = ((): Record<string, CSSProperties> => {
    const styles: Record<string, CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: 'rgba(250, 204, 21, 0.45)' };
      styles[lastMove.to] = { background: 'rgba(250, 204, 21, 0.55)' };
    }
    if (selected) {
      styles[selected] = { background: 'rgba(59, 130, 246, 0.55)' };
      for (const move of game.moves({ square: selected, verbose: true }) as Move[]) {
        styles[move.to] = {
          background: move.captured
            ? 'radial-gradient(circle, rgba(239,68,68,0.55) 30%, transparent 32%)'
            : 'radial-gradient(circle, rgba(30,64,175,0.5) 22%, transparent 24%)',
          borderRadius: move.captured ? '0' : '50%',
        };
      }
    }
    if (game.isCheck()) {
      // Highlight the king in check.
      const board = game.board();
      for (const row of board) {
        for (const p of row) {
          if (p && p.type === 'k' && p.color === game.turn()) {
            styles[p.square] = { background: 'rgba(239, 68, 68, 0.6)' };
          }
        }
      }
    }
    return styles;
  })();

  const chessboardOptions = {
    position: fen,
    onPieceDrop,
    onSquareClick,
    boardOrientation: orientation,
    squareStyles,
    allowDragging: !thinking && !game.isGameOver() && game.turn() === HUMAN_COLOR,
    animationDurationInMs: 200,
    id: 'checkmate-board',
  };

  const moveRows: { no: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    moveRows.push({
      no: i / 2 + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <span className="app__logo">♞</span> Checkmate
        </h1>
        <p className="app__tagline">Play chess against a built-in AI</p>
      </header>

      <main className="layout">
        <section className="board-panel">
          <CapturedRow
            label="AI captured"
            pieces={captured.byBlack}
            advantage={-captured.advantage}
          />
          <div className="board-wrap">
            <Chessboard options={chessboardOptions} />
          </div>
          <CapturedRow
            label="You captured"
            pieces={captured.byWhite}
            advantage={captured.advantage}
          />
        </section>

        <aside className="side-panel">
          <div className={`status status--${status.tone}`}>
            {thinking ? 'AI is thinking…' : status.text}
          </div>

          <div className="controls">
            <button className="btn btn--primary" onClick={newGame}>
              New game
            </button>
            <button className="btn" onClick={undo} disabled={history.length < 2 || thinking}>
              Undo
            </button>
            <button
              className="btn"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
            >
              Flip board
            </button>
          </div>

          <div className="difficulty">
            <span className="difficulty__label">Difficulty</span>
            <div className="difficulty__options">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.label}
                  className={`chip ${depth === d.depth ? 'chip--active' : ''}`}
                  onClick={() => setDepth(d.depth)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="moves">
            <h2 className="moves__title">Moves</h2>
            <div className="moves__list">
              {moveRows.length === 0 ? (
                <p className="moves__empty">No moves yet — make the first move!</p>
              ) : (
                <table>
                  <tbody>
                    {moveRows.map((row) => (
                      <tr key={row.no}>
                        <td className="moves__no">{row.no}.</td>
                        <td className="moves__san">{row.white}</td>
                        <td className="moves__san">{row.black ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function CapturedRow({
  label,
  pieces,
  advantage,
}: {
  label: string;
  pieces: string[];
  advantage: number;
}) {
  const sorted = [...pieces].sort(
    (a, b) => (PIECE_WEIGHT[b] ?? 0) - (PIECE_WEIGHT[a] ?? 0),
  );
  const color = label.startsWith('AI') ? 'w' : 'b';
  return (
    <div className="captured">
      <span className="captured__label">{label}</span>
      <span className="captured__pieces">
        {sorted.map((p, i) => (
          <span key={i} className="captured__glyph">
            {GLYPH[color + p]}
          </span>
        ))}
      </span>
      {advantage > 0 && <span className="captured__adv">+{advantage}</span>}
    </div>
  );
}
