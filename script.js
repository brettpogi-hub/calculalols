/* ================= CALCULATOR ================= */

let useDegrees = true;
let invMode = false;

function insert(num) {
    const total = document.form1.textview.value;
    document.form1.textview.value = total + num;
}

function func(name) {
    insert(name + '(');
}

function negate() {
    const v = document.form1.textview.value;
    if (!v) return;
    if (v.startsWith('-(') && v.endsWith(')')) {
        document.form1.textview.value = v.slice(2, -1);
    } else {
        document.form1.textview.value = '-(' + v + ')';
    }
}

function backspace() {
    let total = document.form1.textview.value;
    total = total.slice(0, -1);
    document.form1.textview.value = total;
}

function toggleAngle() {
    useDegrees = !useDegrees;
    document.getElementById('degBtn').textContent = useDegrees ? 'DEG' : 'RAD';
}

function toggleInv() {
    invMode = !invMode;
    const btn = document.getElementById('invBtn');
    btn.classList.toggle('active', invMode);

    document.getElementById('sinBtn').textContent = invMode ? 'sin⁻¹' : 'sin';
    document.getElementById('cosBtn').textContent = invMode ? 'cos⁻¹' : 'cos';
    document.getElementById('tanBtn').textContent = invMode ? 'tan⁻¹' : 'tan';
    document.getElementById('logBtn').textContent = invMode ? '10ˣ' : 'log';
    document.getElementById('lnBtn').textContent = invMode ? 'eˣ' : 'ln';
    document.getElementById('sqrtBtn').textContent = invMode ? 'x²' : '√';

    document.getElementById('sinBtn').onclick = () => func(invMode ? 'asin' : 'sin');
    document.getElementById('cosBtn').onclick = () => func(invMode ? 'acos' : 'cos');
    document.getElementById('tanBtn').onclick = () => func(invMode ? 'atan' : 'tan');
    document.getElementById('logBtn').onclick = () => func(invMode ? 'tenpow' : 'log');
    document.getElementById('lnBtn').onclick = () => func(invMode ? 'exp' : 'ln');
    document.getElementById('sqrtBtn').onclick = () => func(invMode ? 'sqr' : 'sqrt');
}

function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
}

function equal() {
    let exp = document.form1.textview.value;
    if (!exp) return;

    try {
        const toRad = x => useDegrees ? x * Math.PI / 180 : x;
        const fromRad = x => useDegrees ? x * 180 / Math.PI : x;

        // factorial: 5! or (3+2)!
        exp = exp.replace(/(\d+(\.\d+)?|\([^()]*\))!/g, 'fact($1)');

        // percent: 50% -> (50/100)
        exp = exp.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

        exp = exp.replace(/π/g, '(Math.PI)');
        exp = exp.replace(/\be\b/g, '(Math.E)');
        exp = exp.replace(/\^/g, '**');

        const fns = {
            sin: x => { const r = Math.sin(toRad(x)); return Math.abs(r) < 1e-12 ? 0 : r; },
            cos: x => { const r = Math.cos(toRad(x)); return Math.abs(r) < 1e-12 ? 0 : r; },
            tan: x => { const r = Math.tan(toRad(x)); return Math.abs(r) < 1e-12 ? 0 : r; },
            asin: x => fromRad(Math.asin(x)),
            acos: x => fromRad(Math.acos(x)),
            atan: x => fromRad(Math.atan(x)),
            log: Math.log10,
            ln: Math.log,
            sqrt: Math.sqrt,
            abs: Math.abs,
            exp: Math.exp,
            tenpow: x => Math.pow(10, x),
            sqr: x => x * x,
            fact: factorial
        };

        const names = Object.keys(fns);
        const evaluator = new Function(...names, 'return (' + exp + ');');
        let result = evaluator(...names.map(n => fns[n]));

        if (typeof result === 'number' && isFinite(result)) {
            result = parseFloat(result.toPrecision(12));
        }
        document.form1.textview.value = result;
    } catch (err) {
        document.form1.textview.value = 'Error';
        setTimeout(() => { document.form1.textview.value = ''; }, 1200);
    }
}

/* ================= VIEW SWITCHING ================= */

function showTetris() {
    document.getElementById('calcView').classList.add('hidden');
    document.getElementById('tetrisView').classList.remove('hidden');
    document.querySelector('.top-bar').classList.add('hidden');
    resetTetris();
    drawTetris();
}

function showCalc() {
    stopTetris();
    document.getElementById('tetrisView').classList.add('hidden');
    document.getElementById('calcView').classList.remove('hidden');
    document.querySelector('.top-bar').classList.remove('hidden');
}

/* ================= TETRIS ================= */

const T_COLS = 10;
const T_ROWS = 20;
const T_SIZE = 20;

const tCanvas = document.getElementById('tetrisCanvas');
const tCtx = tCanvas.getContext('2d');
const nCanvas = document.getElementById('nextCanvas');
const nCtx = nCanvas.getContext('2d');

const PIECES = {
    I: { color: '#5ed4f5', shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    O: { color: '#ffd23f', shape: [[1,1],[1,1]] },
    T: { color: '#8b5cf6', shape: [[0,1,0],[1,1,1],[0,0,0]] },
    S: { color: '#4ade80', shape: [[0,1,1],[1,1,0],[0,0,0]] },
    Z: { color: '#e63950', shape: [[1,1,0],[0,1,1],[0,0,0]] },
    J: { color: '#3b82f6', shape: [[1,0,0],[1,1,1],[0,0,0]] },
    L: { color: '#fb923c', shape: [[0,0,1],[1,1,1],[0,0,0]] }
};
const PIECE_KEYS = Object.keys(PIECES);

let tBoard, tCurrent, tNext, tScore, tLines, tLevel;
let tTimer = null;
let tRunning = false;
let tPaused = false;
let tOver = false;

function emptyBoard() {
    return Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(null));
}

function randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const p = PIECES[key];
    return {
        shape: p.shape.map(r => r.slice()),
        color: p.color,
        x: Math.floor((T_COLS - p.shape[0].length) / 2),
        y: 0
    };
}

function resetTetris() {
    stopTetris();
    tBoard = emptyBoard();
    tScore = 0;
    tLines = 0;
    tLevel = 1;
    tOver = false;
    tPaused = false;
    tCurrent = randomPiece();
    tNext = randomPiece();
    updateTetrisInfo();
    drawNext();
}

function collides(piece, ox = 0, oy = 0, shape = piece.shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = piece.x + c + ox;
            const ny = piece.y + r + oy;
            if (nx < 0 || nx >= T_COLS || ny >= T_ROWS) return true;
            if (ny >= 0 && tBoard[ny][nx]) return true;
        }
    }
    return false;
}

function merge(piece) {
    piece.shape.forEach((row, r) => {
        row.forEach((v, c) => {
            if (v && piece.y + r >= 0) tBoard[piece.y + r][piece.x + c] = piece.color;
        });
    });
}

function clearLines() {
    let cleared = 0;
    for (let r = T_ROWS - 1; r >= 0; r--) {
        if (tBoard[r].every(cell => cell)) {
            tBoard.splice(r, 1);
            tBoard.unshift(Array(T_COLS).fill(null));
            cleared++;
            r++;
        }
    }
    if (cleared) {
        const pts = [0, 100, 300, 500, 800];
        tScore += pts[cleared] * tLevel;
        tLines += cleared;
        const newLevel = Math.floor(tLines / 10) + 1;
        if (newLevel !== tLevel) {
            tLevel = newLevel;
            if (tRunning) restartInterval();
        }
        updateTetrisInfo();
    }
}

function rotateMatrix(m) {
    const n = m.length;
    const res = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
            res[c][n - 1 - r] = m[r][c];
    return res;
}

function tRotate() {
    if (!tRunning || tPaused || tOver) return;
    const rotated = rotateMatrix(tCurrent.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
        if (!collides(tCurrent, k, 0, rotated)) {
            tCurrent.shape = rotated;
            tCurrent.x += k;
            drawTetris();
            return;
        }
    }
}

function tMove(dir) {
    if (!tRunning || tPaused || tOver) return;
    if (!collides(tCurrent, dir, 0)) {
        tCurrent.x += dir;
        drawTetris();
    }
}

function lockPiece() {
    merge(tCurrent);
    clearLines();
    tCurrent = tNext;
    tNext = randomPiece();
    drawNext();
    if (collides(tCurrent, 0, 0)) {
        tOver = true;
        tRunning = false;
        stopTetris();
    }
    drawTetris();
}

function tSoftDrop() {
    if (!tRunning || tPaused || tOver) return;
    if (!collides(tCurrent, 0, 1)) {
        tCurrent.y++;
        tScore += 1;
        updateTetrisInfo();
    } else {
        lockPiece();
    }
    drawTetris();
}

function tHardDrop() {
    if (!tRunning || tPaused || tOver) return;
    let dist = 0;
    while (!collides(tCurrent, 0, 1)) {
        tCurrent.y++;
        dist++;
    }
    tScore += dist * 2;
    updateTetrisInfo();
    lockPiece();
}

function tickDelay() {
    return Math.max(100, 800 - (tLevel - 1) * 70);
}

function restartInterval() {
    clearInterval(tTimer);
    tTimer = setInterval(tTick, tickDelay());
}

function tTick() {
    if (!tRunning || tPaused || tOver) return;
    if (!collides(tCurrent, 0, 1)) {
        tCurrent.y++;
    } else {
        lockPiece();
    }
    drawTetris();
}

function startTetris() {
    resetTetris();
    tRunning = true;
    restartInterval();
    drawTetris();
}

function pauseTetris() {
    if (!tRunning || tOver) return;
    tPaused = !tPaused;
    drawTetris();
}

function stopTetris() {
    clearInterval(tTimer);
    tTimer = null;
    tRunning = false;
}

function updateTetrisInfo() {
    document.getElementById('tScore').textContent = tScore;
    document.getElementById('tLines').textContent = tLines;
    document.getElementById('tLevel').textContent = tLevel;
}

function drawBlock(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x * size, y * size, size, 3);
    ctx.fillRect(x * size, y * size, 3, size);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x * size, y * size + size - 3, size, 3);
    ctx.fillRect(x * size + size - 3, y * size, 3, size);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(x * size + 0.5, y * size + 0.5, size - 1, size - 1);
}

function drawTetris() {
    tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);

    // grid
    tCtx.strokeStyle = 'rgba(255,255,255,0.04)';
    tCtx.lineWidth = 1;
    for (let x = 1; x < T_COLS; x++) {
        tCtx.beginPath();
        tCtx.moveTo(x * T_SIZE + 0.5, 0);
        tCtx.lineTo(x * T_SIZE + 0.5, tCanvas.height);
        tCtx.stroke();
    }
    for (let y = 1; y < T_ROWS; y++) {
        tCtx.beginPath();
        tCtx.moveTo(0, y * T_SIZE + 0.5);
        tCtx.lineTo(tCanvas.width, y * T_SIZE + 0.5);
        tCtx.stroke();
    }

    // board
    for (let r = 0; r < T_ROWS; r++)
        for (let c = 0; c < T_COLS; c++)
            if (tBoard[r][c]) drawBlock(tCtx, c, r, T_SIZE, tBoard[r][c]);

    // ghost + current
    if (tCurrent && !tOver) {
        let gy = 0;
        while (!collides(tCurrent, 0, gy + 1)) gy++;
        tCurrent.shape.forEach((row, r) => {
            row.forEach((v, c) => {
                if (v) {
                    tCtx.fillStyle = 'rgba(255,255,255,0.12)';
                    tCtx.fillRect((tCurrent.x + c) * T_SIZE, (tCurrent.y + r + gy) * T_SIZE, T_SIZE, T_SIZE);
                }
            });
        });
        tCurrent.shape.forEach((row, r) => {
            row.forEach((v, c) => {
                if (v) drawBlock(tCtx, tCurrent.x + c, tCurrent.y + r, T_SIZE, tCurrent.color);
            });
        });
    }

    // overlays
    if (!tRunning && !tOver && !tPaused) {
        overlayText('PRESS START');
    } else if (tPaused) {
        overlayText('PAUSED');
    } else if (tOver) {
        overlayText('GAME OVER', 'Score ' + tScore);
    }
}

function overlayText(main, sub) {
    tCtx.fillStyle = 'rgba(5,5,10,0.72)';
    tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
    tCtx.textAlign = 'center';
    tCtx.fillStyle = '#e63950';
    tCtx.font = '24px Bangers, cursive';
    tCtx.fillText(main, tCanvas.width / 2, tCanvas.height / 2);
    if (sub) {
        tCtx.fillStyle = '#5ed4f5';
        tCtx.font = '16px Orbitron, sans-serif';
        tCtx.fillText(sub, tCanvas.width / 2, tCanvas.height / 2 + 28);
    }
}

function drawNext() {
    nCtx.clearRect(0, 0, nCanvas.width, nCanvas.height);
    if (!tNext) return;
    const size = 18;
    const w = tNext.shape[0].length;
    const h = tNext.shape.length;
    const offX = (nCanvas.width - w * size) / 2 / size;
    const offY = (nCanvas.height - h * size) / 2 / size;
    tNext.shape.forEach((row, r) => {
        row.forEach((v, c) => {
            if (v) drawBlock(nCtx, c + offX, r + offY, size, tNext.color);
        });
    });
}

/* ================= KEYBOARD ================= */

document.addEventListener('keydown', e => {
    const tetrisOpen = !document.getElementById('tetrisView').classList.contains('hidden');
    if (!tetrisOpen) return;

    switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); tMove(-1); break;
        case 'ArrowRight': e.preventDefault(); tMove(1); break;
        case 'ArrowUp':    e.preventDefault(); tRotate(); break;
        case 'ArrowDown':  e.preventDefault(); tSoftDrop(); break;
        case ' ':          e.preventDefault(); tHardDrop(); break;
        case 'p':
        case 'P':          pauseTetris(); break;
    }
});