# Checkmate ♞

A modern, responsive web chess app. Play a full game of chess against a built-in
AI opponent right in your browser — with legal-move validation, check / checkmate /
stalemate detection, move history, and captured-piece tracking.

<img src="docs/screenshot.png" alt="Checkmate board" width="640" />

## Features

- ♟️ **Full chess rules** powered by [`chess.js`](https://github.com/jhlywa/chess.js)
  (castling, en passant, promotion, draws).
- 🤖 **Built-in AI** using negamax search with alpha-beta pruning and piece-square
  evaluation. Three difficulty levels (search depth 1–3).
- 🎯 **Drag-and-drop or click-to-move** with legal-move highlighting.
- 🟨 Last-move and check highlighting, captured-piece tray and material advantage.
- 📜 Live move history in standard algebraic notation.
- 🎨 Clean, dark, responsive UI built with React 19 + Vite.

## Tech stack

| Concern      | Choice                          |
| ------------ | ------------------------------- |
| Build tool   | [Vite](https://vitejs.dev/)     |
| UI           | React 19 + TypeScript           |
| Chess rules  | `chess.js`                      |
| Board        | `react-chessboard`              |

## Getting started

Requires **Node.js 20+**.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

Then open http://localhost:5173 and play — you are White, the AI is Black.

## Scripts

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server (port 5173).            |
| `npm run build`     | Type-check and build the production bundle.        |
| `npm run preview`   | Preview the production build (port 4173).          |
| `npm run lint`      | Run ESLint over the project.                       |
| `npm run typecheck` | Type-check without emitting output.                |

## Project structure

```
.
├── index.html            # App entry HTML
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Game UI, board wiring, controls
│   ├── engine.ts         # Chess AI (negamax + alpha-beta + eval)
│   └── index.css         # Styling
├── vite.config.ts
└── .cursor/environment.json  # Cloud Agent dev environment
```

## How the AI works

The engine (`src/engine.ts`) enumerates legal moves with `chess.js`, orders them
(captures / promotions first) for better pruning, and runs a depth-limited
**negamax** search with **alpha-beta pruning**. Positions are scored from
material values plus classic piece-square tables, so the AI develops pieces,
fights for the centre, and keeps its king reasonably safe.
