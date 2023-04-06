import { CARDINAL_DIRECTIONS, clamp16, palette, runGC, setColorData, setColors, zeroLeadingNumber } from '../util';
import * as Texture from '../texture';
import * as w4 from '../wasm4';
import { World } from './world';
import * as Tiles from './tiles';
import { Player, setPlayerColor } from './player';
import { PIXEL_PER_TILE } from './constants';
import { WORLD_SIZE, MAPS } from './worlds/world_vs';
import { GameState, GameStateChanger } from '../gameState';
import { WinScreen } from '../menu/winScreen';
import * as Font from '../fonts';
import { StartingPowerUps } from '../menu/selectGame';

export class Stats {
	static VOID: Stats = new Stats();

	score: i8 = 0; 
	bombs: u32 = 0; 
	kills: u32 = 0; 
	deaths: u32 = 0; 
}

Stats.VOID.score = -1;

export class MultiplayerGame extends GameState {
	readonly world: World = new World(WORLD_SIZE, WORLD_SIZE);
	readonly players: StaticArray<Player | null> = new StaticArray(4);
	stats: StaticArray<Stats>;
	tick: u32 = 0;
	timer: i32 = 60 * 3;
	endGame: bool = false;
	tickGame: bool = false;
	endOnWinCount: u8;
	mapId: i8;
	startingUpgrades: StartingPowerUps;

	constructor(changer: GameStateChanger, startingPowerUps: StartingPowerUps, player1: bool, player2: bool, player3: bool, endOnWinCount: u8, mapId: i8, stats: StaticArray<Stats>) {
		super(changer);
		this.endOnWinCount = endOnWinCount;
		this.mapId = mapId;
		this.startingUpgrades = startingPowerUps;
		this.stats = stats;
		this.setupWorld();
		this.setupPlayers(player1, player2, player3);
	}

	setupWorld(): void {
		const map = this.mapId == -1 ? MAPS[u32(MAPS.length * Math.random())] : MAPS[this.mapId];
		
		this.world.load(map.layout);
		
		for (let x: u16 = 0; x < WORLD_SIZE; x++) {
			for (let y: u16 = 0; y < WORLD_SIZE; y++) {
				if (this.world.getTile(x, y) == Tiles.EMPTY && Math.random() > 0.3) {
					this.world.setTile(x, y, Tiles.BOULDER);
				}
			}
		}
	}

	setupPlayers(hasPlayer1: bool, hasPlayer2: bool, hasPlayer3: bool): void {
		const player0 = new Player(this.world, 0);
		player0.setPos(1.5 * PIXEL_PER_TILE, 1.5 * PIXEL_PER_TILE);
		this.world.addEntity(player0);
		this.players[0] = player0;

		if (hasPlayer1) {
			const player1 = new Player(this.world, 1);
			player1.setPos((1.5 + 12) * PIXEL_PER_TILE, 1.5 * PIXEL_PER_TILE);
			this.world.addEntity(player1);
			this.players[1] = player1;

		}

		if (hasPlayer2) {
			const player2 = new Player(this.world, 2);
			player2.setPos(1.5 * PIXEL_PER_TILE, (1.5 + 12) * PIXEL_PER_TILE);
			this.world.addEntity(player2);
			this.players[2] = player2;
		}

		if (hasPlayer3) {
			const player3 = new Player(this.world, 3);
			player3.setPos((1.5 + 12) * PIXEL_PER_TILE, (1.5 + 12) * PIXEL_PER_TILE);
			this.world.addEntity(player3);
			this.players[3] = player3;
		}

		for (let i = 0; i < 4; i++) {
			const player = this.players[i];

			if (player) {
				const xBase: u16 = player.pixelX() / PIXEL_PER_TILE;
				const yBase: u16 = player.pixelY() / PIXEL_PER_TILE;
				this.world.setTile(xBase, yBase, Tiles.EMPTY);

				for (let d = 0; d < CARDINAL_DIRECTIONS.length; d++) {
					const dir = CARDINAL_DIRECTIONS[d];
					if (this.world.getTile(xBase + dir[0], yBase + dir[1]) == Tiles.BOULDER) {
						this.world.setTile(xBase + dir[0], yBase + dir[1], Tiles.EMPTY);
					}
				}

				if (this.stats[i] == Stats.VOID) {
					this.stats[i] = new Stats();
				}
				player.stats = this.stats[i];

				player.maxBombs += this.startingUpgrades.bombs;
				player.explosionSize += this.startingUpgrades.power;
				player.explosionTime -= this.startingUpgrades.quickBomb;
				player.speed += this.startingUpgrades.speed;
			}
		}
	}

	public update(): void {
		this.tick++;
		this.timer--;

		this.runWorldLogic();
		this.runVictoryLogic();


		if (this.tickGame) {
			for (let i = 0; i < 4; i++) {
				const player = this.players[i];

				if (player) {
					player.handleInput(load<u8>(w4.GAMEPAD1 + i));
				}
			}
		}


		setColors(4, 0, 0, 0);
		for (let p: u8 = 0; p < 4; p++) {
			if (this.players[p] != null) {
				setPlayerColor(p);
				w4.blitSub(Texture.PLAYER_TEX, p * (8 * 3), 0, 10, 10, 10, 0, Texture.PLAYER_WIDTH, Texture.PLAYER_FLAGS);

				setColors(0, 4, 0, 0)
				Font.F6x8.draw(zeroLeadingNumber(this.stats[p].score, 2), p * 3 * 8 + 10, 1);
			}
		}
		runGC();
	}
	runVictoryLogic(): void {
		let alivePlayers: u8 = 0;
		let alivePlayerId: i8 = 0;
		for (let p: u8 = 0; p < 4; p++) {
			const player = this.players[p];

			if (player && !player.isDead) {
				alivePlayers++;
				alivePlayerId = p + 1;
			}
		}

		if (alivePlayers <= 1 && !this.endGame) {
			this.endGame = true;
			this.tickGame = false;
			this.timer = 90;
			if (alivePlayerId != 0) {
				this.stats[alivePlayerId - 1].score++;
			}
		}

		if (this.timer < 0) {
			if (this.endGame) {
				let playerMaxWin: u8 = 0;
				for (let p: u8 = 0; p < 4; p++) {
					if (this.stats[p].score == this.endOnWinCount) {
						playerMaxWin = p + 1;
						break;
					}
				}

				if (playerMaxWin == 0) {
					const newGame = new MultiplayerGame(this.changer, this.startingUpgrades, this.players[1] != null, this.players[2] != null, this.players[3] != null, this.endOnWinCount, this.mapId, this.stats);
					this.changer(newGame);
				} else {
					this.changer(new WinScreen(this.changer, this.stats, this.endOnWinCount, this.startingUpgrades));
				}
			} else {
				this.tickGame = true;
			}
		} else if (this.endGame) {
			const text = alivePlayerId == 0 ? 'Tie!' : 'Player ' + alivePlayerId.toString() + ' won!';
			setColors(2, 4, 0, 0);
			w4.rect(w4.SCREEN_SIZE / 2 - text.length * 4 - 4, w4.SCREEN_SIZE / 2 - 8, text.length * 8 + 8, 16)
			setColors(4, 2, 0, 0);
			w4.text(text, w4.SCREEN_SIZE / 2 - text.length * 4, w4.SCREEN_SIZE / 2 - 4);
		} else {
			setColors(2, 4, 0, 0);
			w4.rect(w4.SCREEN_SIZE / 2 - 16, w4.SCREEN_SIZE / 2 - 8, 32, 16)
			setColors(4, 2, 0, 0);
			if (this.timer < 60) {
				w4.text('GO!', w4.SCREEN_SIZE / 2 - 12, w4.SCREEN_SIZE / 2 - 4);
			} else {
				w4.text((this.timer / 60).toString(), w4.SCREEN_SIZE / 2 - 4, w4.SCREEN_SIZE / 2 - 4);
			}
		}
	}

	runWorldLogic(): void {
		runGC();

		const screenTiles: i16 = i8(w4.SCREEN_SIZE / PIXEL_PER_TILE + 1);
		const cameraDeltaX: i16 = 5;
		const cameraDeltaY: i16 = 10;

		for (let x: i16 = -1; x <= screenTiles; x++) {
			for (let y: i16 = 0; y <= screenTiles; y++) {
				const tile = this.world.getTile(clamp16(x, 0, this.world.width - 1), clamp16(y, 0, this.world.height - 1));
				setColorData(tile.color);

				let flags = 0;
				if (tile.randomRotation) {
					let val: i32 = (31 * x + 17 * y) / 2;

					if (val & 0x01) {
						flags |= w4.BLIT_ROTATE;
					}

					if (val & 0x02) {
						flags |= w4.BLIT_FLIP_X;
					}

					if (val & 0x04) {
						flags |= w4.BLIT_FLIP_Y;
					}
				}

				w4.blitSub(
					Texture.TILES_TEX,
					x * PIXEL_PER_TILE + cameraDeltaX,
					y * PIXEL_PER_TILE + cameraDeltaY,
					PIXEL_PER_TILE,
					PIXEL_PER_TILE,
					tile.texture * PIXEL_PER_TILE,
					0,
					Texture.TILES_WIDTH,
					tile.textureFlags | w4.BLIT_2BPP | flags
				);

				if (tile.border != Tiles.BorderType.NONE && x >= 0 && y >= 0 && x < i16(this.world.width) && y < i16(this.world.height)) {
					setColors(4, 4, 4, 4);

					for (let i: u8 = 0; i < 2; i++) {
						const dir = i == 0 ? -1 : 1;
						const xDelta = i == 0 ? 0 : PIXEL_PER_TILE - 1;

						const typeX = this.world.getTile(u16(x + dir), y);
						const typeY = this.world.getTile(x, u16(y + dir));

						if (
							!((i == 0 && x == 0) || (i == 1 && x == this.world.width - 1)) &&
							((tile.border == Tiles.BorderType.NON_COLLIDABLE && !typeX.collisions) || (tile.border == Tiles.BorderType.NON_SELF && typeX != tile))
						) {
							w4.vline(x * PIXEL_PER_TILE + cameraDeltaX + xDelta, y * PIXEL_PER_TILE + cameraDeltaY, PIXEL_PER_TILE);
						}

						if (
							!((i == 0 && y == 0) || (i == 1 && y == this.world.height - 1)) &&
							((tile.border == Tiles.BorderType.NON_COLLIDABLE && !typeY.collisions) || (tile.border == Tiles.BorderType.NON_SELF && typeY != tile))
						) {
							w4.hline(x * PIXEL_PER_TILE + cameraDeltaX, y * PIXEL_PER_TILE + cameraDeltaY + xDelta, PIXEL_PER_TILE);
						}
					}
				}
			}
		}
		runGC();

		const ents = this.world.getEntities();
		for (let i = 0; i < ents.length; i++) {
			const entity = ents[ents.length - i - 1];

			if (this.tickGame) {
				entity.tick();
			}

			entity.draw(cameraDeltaX, cameraDeltaY, this.tick);

			runGC();
		}
	}
}
