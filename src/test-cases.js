import {
  BOARD_SIZE,
  FLEET_DEFINITIONS,
  createGame,
  fireShot,
  placeShip,
} from "./battleship.js";

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Esperado: ${String(expected)}; recebido: ${String(actual)}.`);
  }
}

function throws(action, ErrorType, message) {
  let thrown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  if (!(thrown instanceof ErrorType)) {
    throw new Error(`${message} Esperado ${ErrorType.name}; recebido ${thrown?.constructor?.name ?? "nenhum erro"}.`);
  }
}

function placeFleet(game) {
  placeShip(game, "porta-avioes", 0, 0, "horizontal");
  placeShip(game, "encouracado", 0, 5, "vertical");
  placeShip(game, "submarino", 2, 0, "horizontal");
  placeShip(game, "destroier", 5, 8, "vertical");
  return game;
}

export const BATTLESHIP_TESTS = [
  {
    id: "board-size",
    title: "Cria um tabuleiro com 10 × 10 casas",
    run() {
      const game = createGame();
      equal(game.board.length, 10, "O tabuleiro deve ter 10 linhas.");
      equal(game.board.every((row) => row.length === 10), true, "Cada linha deve ter 10 colunas.");
      equal(new Set(game.board.flat()).size, 100, "As 100 casas devem ser objetos distintos.");
      equal(game.size, BOARD_SIZE, "A dimensão informada pelo jogo deve ser 10.");
    },
  },
  {
    id: "fleet-composition",
    title: "Define os quatro navios e seus comprimentos",
    run() {
      const game = createGame();
      equal(game.ships.length, 4, "A frota deve conter exatamente quatro navios.");
      equal(game.ships.map((ship) => ship.length).join(","), "5,4,3,2", "Os comprimentos devem ser 5, 4, 3 e 2.");
      equal(game.ships.map((ship) => ship.name).join("|"), "Porta-aviões|Encouraçado|Submarino|Destroier", "Os navios devem corresponder à frota especificada.");
      equal(FLEET_DEFINITIONS.reduce((total, ship) => total + ship.length, 0), 14, "A frota deve ocupar 14 casas.");
    },
  },
  {
    id: "horizontal-placement",
    title: "Posiciona navio horizontalmente",
    run() {
      const game = createGame();
      const ship = placeShip(game, "porta-avioes", 3, 2, "horizontal");
      equal(ship.positions.length, 5, "O porta-aviões deve ocupar cinco casas.");
      equal(ship.positions.every((position, index) => position.row === 3 && position.column === 2 + index), true, "As casas devem ser contíguas na horizontal.");
      equal(game.status, "placing", "A partida deve continuar em preparação enquanto houver navios sem posição.");
    },
  },
  {
    id: "vertical-placement",
    title: "Posiciona navio verticalmente",
    run() {
      const game = createGame();
      const ship = placeShip(game, "submarino", 1, 7, "vertical");
      equal(ship.positions.length, 3, "O submarino deve ocupar três casas.");
      equal(ship.positions.every((position, index) => position.row === 1 + index && position.column === 7), true, "As casas devem ser contíguas na vertical.");
    },
  },
  {
    id: "out-of-bounds-placement",
    title: "Rejeita navio que ultrapassa a borda",
    run() {
      const game = createGame();
      throws(() => placeShip(game, "porta-avioes", 0, 6, "horizontal"), RangeError, "O porta-aviões não cabe a partir da coluna 6.");
      equal(game.board.flat().filter((cell) => cell.shipId !== null).length, 0, "Uma tentativa inválida não pode posicionar parte do navio.");
    },
  },
  {
    id: "overlap-rejected",
    title: "Rejeita sobreposição entre navios",
    run() {
      const game = createGame();
      placeShip(game, "porta-avioes", 0, 0, "horizontal");
      throws(() => placeShip(game, "encouracado", 0, 4, "horizontal"), Error, "Dois navios não podem ocupar a mesma casa.");
      equal(game.ships.find((ship) => ship.id === "encouracado").placed, false, "O navio em conflito deve permanecer sem posição.");
    },
  },
  {
    id: "invalid-orientation",
    title: "Rejeita orientação inválida",
    run() {
      const game = createGame();
      throws(() => placeShip(game, "submarino", 1, 1, "diagonal"), RangeError, "Só são aceitas orientações horizontal ou vertical.");
    },
  },
  {
    id: "unknown-ship",
    title: "Rejeita navio inexistente",
    run() {
      const game = createGame();
      throws(() => placeShip(game, "cruzador", 1, 1, "horizontal"), RangeError, "A frota não contém o navio informado.");
    },
  },
  {
    id: "fire-before-setup",
    title: "Impede disparo antes de posicionar toda a frota",
    run() {
      const game = createGame();
      throws(() => fireShot(game, 0, 0), Error, "Não é possível disparar durante a preparação.");
    },
  },
  {
    id: "shot-out-of-bounds",
    title: "Rejeita disparo fora do tabuleiro",
    run() {
      const game = placeFleet(createGame());
      throws(() => fireShot(game, 10, 0), RangeError, "Linha 10 está fora do tabuleiro.");
      throws(() => fireShot(game, 0, -1), RangeError, "Coluna negativa está fora do tabuleiro.");
    },
  },
  {
    id: "miss-shot",
    title: "Registra disparo na água",
    run() {
      const game = placeFleet(createGame());
      const result = fireShot(game, 9, 9);
      equal(result.result, "miss", "Uma casa sem navio deve ser registrada como água.");
      equal(game.shotsFired, 1, "O disparo deve incrementar o total de tiros.");
      equal(game.shotsHit, 0, "Um erro não deve incrementar acertos.");
    },
  },
  {
    id: "hit-shot",
    title: "Registra acerto em um navio",
    run() {
      const game = placeFleet(createGame());
      const result = fireShot(game, 0, 0);
      equal(result.result, "hit", "A casa ocupada deve registrar acerto.");
      equal(result.shipId, "porta-avioes", "O acerto deve identificar o navio correto.");
      equal(game.shotsHit, 1, "O total de acertos deve aumentar.");
    },
  },
  {
    id: "repeat-shot",
    title: "Não contabiliza duas vezes o mesmo disparo",
    run() {
      const game = placeFleet(createGame());
      fireShot(game, 0, 0);
      const result = fireShot(game, 0, 0);
      equal(result.result, "repeat", "Um alvo já atingido deve ser identificado como repetido.");
      equal(game.shotsFired, 1, "Um disparo repetido não deve aumentar os tiros.");
      equal(game.shotsHit, 1, "Um disparo repetido não deve aumentar os acertos.");
      equal(game.ships.find((ship) => ship.id === "porta-avioes").hits, 1, "O mesmo segmento não deve contar duas vezes.");
    },
  },
  {
    id: "sink-and-win",
    title: "Afunda navios e encerra ao eliminar toda a frota",
    run() {
      const game = placeFleet(createGame());
      const carrier = game.ships.find((ship) => ship.id === "porta-avioes");
      for (const position of carrier.positions) fireShot(game, position.row, position.column);
      equal(carrier.sunk, true, "O porta-aviões deve afundar após cinco acertos distintos.");
      equal(game.status, "playing", "Afundar um navio não encerra enquanto restar frota.");

      for (const ship of game.ships.filter((candidate) => !candidate.sunk)) {
        for (const position of ship.positions) fireShot(game, position.row, position.column);
      }
      equal(game.ships.every((ship) => ship.sunk), true, "Todos os navios devem estar afundados.");
      equal(game.status, "won", "Eliminar toda a frota deve encerrar a partida com vitória.");
      equal(game.shotsHit, 14, "A frota completa ocupa 14 casas e exige 14 acertos.");
    },
  },
];
