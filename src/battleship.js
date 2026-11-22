export const BOARD_SIZE = 10;

export const FLEET_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "porta-avioes", name: "Porta-aviões", length: 5 }),
  Object.freeze({ id: "encouracado", name: "Encouraçado", length: 4 }),
  Object.freeze({ id: "submarino", name: "Submarino", length: 3 }),
  Object.freeze({ id: "destroier", name: "Destroier", length: 2 }),
]);

function assertCoordinate(row, column) {
  if (!Number.isInteger(row) || !Number.isInteger(column)) {
    throw new TypeError("Linha e coluna devem ser números inteiros.");
  }
  if (row < 0 || row >= BOARD_SIZE || column < 0 || column >= BOARD_SIZE) {
    throw new RangeError(`Coordenadas fora do tabuleiro ${BOARD_SIZE} × ${BOARD_SIZE}.`);
  }
}

function findShip(game, shipId) {
  const ship = game.ships.find((candidate) => candidate.id === shipId);
  if (!ship) throw new RangeError(`Navio desconhecido: ${shipId}.`);
  return ship;
}

export function createGame() {
  const board = Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, column) => ({ row, column, shipId: null, shot: false })),
  );
  const ships = FLEET_DEFINITIONS.map((definition) => ({
    ...definition,
    positions: [],
    hits: 0,
    placed: false,
    sunk: false,
  }));

  return {
    size: BOARD_SIZE,
    board,
    ships,
    status: "placing",
    shotsFired: 0,
    shotsHit: 0,
  };
}

export function placeShip(game, shipId, startRow, startColumn, orientation) {
  if (game.status !== "placing") {
    throw new Error("Os navios só podem ser posicionados antes do início da partida.");
  }
  const ship = findShip(game, shipId);
  if (ship.placed) throw new Error(`${ship.name} já foi posicionado.`);
  if (orientation !== "horizontal" && orientation !== "vertical") {
    throw new RangeError("A orientação deve ser 'horizontal' ou 'vertical'.");
  }
  assertCoordinate(startRow, startColumn);

  const positions = Array.from({ length: ship.length }, (_, offset) => ({
    row: startRow + (orientation === "vertical" ? offset : 0),
    column: startColumn + (orientation === "horizontal" ? offset : 0),
  }));

  for (const position of positions) {
    if (position.row >= BOARD_SIZE || position.column >= BOARD_SIZE) {
      throw new RangeError(`${ship.name} não cabe nessa posição do tabuleiro.`);
    }
    if (game.board[position.row][position.column].shipId !== null) {
      throw new Error(`${ship.name} não pode ocupar uma casa já usada por outro navio.`);
    }
  }

  for (const position of positions) {
    game.board[position.row][position.column].shipId = ship.id;
  }
  ship.positions = positions;
  ship.placed = true;
  if (game.ships.every((candidate) => candidate.placed)) game.status = "playing";
  return ship;
}

export function fireShot(game, row, column) {
  if (game.status !== "playing") {
    throw new Error("Os disparos só podem ser feitos depois de posicionar toda a frota e antes do fim da partida.");
  }
  assertCoordinate(row, column);

  const cell = game.board[row][column];
  if (cell.shot) return { result: "repeat", row, column, shipId: cell.shipId };

  cell.shot = true;
  game.shotsFired += 1;
  if (cell.shipId === null) return { result: "miss", row, column, shipId: null };

  const ship = findShip(game, cell.shipId);
  ship.hits += 1;
  game.shotsHit += 1;
  if (ship.hits === ship.length) ship.sunk = true;
  if (game.ships.every((candidate) => candidate.sunk)) game.status = "won";

  return { result: ship.sunk ? "sunk" : "hit", row, column, shipId: ship.id };
}
