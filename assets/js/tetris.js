const canvas = document.getElementById("tetris");
if (!canvas) {
  throw new Error("Tetris canvas not found");
}
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Tetris canvas context not available");
}

const cols = 20;
const rows = 20;
const block = 20;
const dropInterval = 600;

canvas.width = cols * block;
canvas.height = rows * block;

const colors = [
  null,
  "#2aa198",
  "#5ec4bd",
  "#8ad8d1",
  "#b5ece7",
  "#1f7f79",
  "#49b1ab",
  "#7fd0c9",
];

const shapes = {
  I: [
    [1, 1, 1, 1],
  ],
  O: [
    [2, 2],
    [2, 2],
  ],
  T: [
    [0, 3, 0],
    [3, 3, 3],
  ],
  S: [
    [0, 4, 4],
    [4, 4, 0],
  ],
  Z: [
    [5, 5, 0],
    [0, 5, 5],
  ],
  J: [
    [6, 0, 0],
    [6, 6, 6],
  ],
  L: [
    [0, 0, 7],
    [7, 7, 7],
  ],
};

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

let best = 0;
let score = 0;
let lastTime = 0;
let dropCounter = 0;
const swipeThreshold = 24;
let touchStart = null;

function createMatrix(width, height) {
  const matrix = [];
  for (let y = 0; y < height; y++) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

function createPiece() {
  const keys = Object.keys(shapes);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return shapes[type].map((row) => row.slice());
}

function collide(board, player) {
  const { matrix, pos } = player;
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        const boardY = y + pos.y;
        const boardX = x + pos.x;
        if (
          boardY < 0 ||
          boardY >= rows ||
          boardX < 0 ||
          boardX >= cols ||
          (board[boardY] && board[boardY][boardX] !== 0)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix) {
  const result = matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
  return result;
}

function sweep(board) {
  let rowCount = 0;
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((value) => value !== 0)) {
      const row = board.splice(y, 1)[0].fill(0);
      board.unshift(row);
      rowCount++;
      y++;
    }
  }
  if (rowCount > 0) {
    const points = [0, 40, 100, 300, 1200][rowCount];
    score += points;
    if (score > best) best = score;
    updateScore();
  }
}

function resetPlayer() {
  player.matrix = createPiece();
  player.pos.y = 0;
  player.pos.x = Math.floor((cols - player.matrix[0].length) / 2);
  if (collide(board, player)) {
    board.forEach((row) => row.fill(0));
    score = 0;
    updateScore();
  }
}

function updateScore() {
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value] || colors[1];
        ctx.fillRect((x + offset.x) * block, (y + offset.y) * block, block - 1, block - 1);
      }
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMatrix(board, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function playerDrop() {
  player.pos.y++;
  if (collide(board, player)) {
    player.pos.y--;
    merge(board, player);
    sweep(board);
    resetPlayer();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(board, player)) {
    player.pos.x -= dir;
  }
}

function playerRotate() {
  const pos = player.pos.x;
  let offset = 1;
  const rotated = rotate(player.matrix);
  player.matrix = rotated;
  while (collide(board, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) {
      player.matrix = rotate(rotate(rotate(rotated)));
      player.pos.x = pos;
      return;
    }
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

const board = createMatrix(cols, rows);
const player = {
  pos: { x: 0, y: 0 },
  matrix: createPiece(),
};

resetPlayer();
updateScore();
update();

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") playerMove(-1);
  if (e.key === "ArrowRight") playerMove(1);
  if (e.key === "ArrowDown") playerDrop();
  if (e.key === "ArrowUp") playerRotate();
});

function onTouchStart(e) {
  if (!e.touches || e.touches.length === 0) return;
  const touch = e.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function onTouchMove(e) {
  if (!touchStart) return;
  e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchStart || !e.changedTouches || e.changedTouches.length === 0) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;

  if (Math.abs(dx) < swipeThreshold && Math.abs(dy) < swipeThreshold) {
    playerRotate();
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    playerMove(dx > 0 ? 1 : -1);
  } else if (dy > 0) {
    playerDrop();
  } else {
    playerRotate();
  }
}

canvas.addEventListener("touchstart", onTouchStart, { passive: true });
canvas.addEventListener("touchmove", onTouchMove, { passive: false });
canvas.addEventListener("touchend", onTouchEnd);
