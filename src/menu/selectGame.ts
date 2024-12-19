import { MultiplayerGame, Stats } from '../game/main';
import { RUN_ANIM_X, setPlayerColor } from '../game/player';
import { MAPS, WORLD_SIZE } from '../game/worlds/world_vs';
import { GameState, GameStateChanger } from '../gameState';
import * as Texture from '../texture';
import { setColors } from '../util';
import * as w4 from '../wasm4';
import { MainMenu } from './main';
import * as Font from '../fonts';
import { ButtonType, NumberOption, Option, SimpleOption } from './options';

export class StartingPowerUps {
	power: i8 = 0;
	speed: i8 = 0;
	bombs: i8 = 0;
	quickBomb: i8 = 0;
}

const OPTIONS: StaticArray<Option<SelectGameMode>> = [
	new SimpleOption<SelectGameMode>(
		40,
		(selector) => {
			return 'Map: ' + (selector.mapId == -1 ? 'Random' : MAPS[selector.mapId].name);
		},
		(selector, button) => {
			if (button == ButtonType.RIGHT || button == ButtonType.X) {
				selector.mapId = min(selector.mapId + 1, i8(MAPS.length - 1));
			} else {
				selector.mapId = max(selector.mapId - 1, -1);
			}
		}
	),
	new NumberOption<SelectGameMode>(50, "Rounds", 1, 16, (s) => s.rounds, (s, i) => s.rounds = i),
	new NumberOption<SelectGameMode>(60, "Extra Bombs", 0, 16, (s) => s.startingPowerUps.bombs, (s, i) => s.startingPowerUps.bombs = i),
	new NumberOption<SelectGameMode>(70, "Extra Power", 0, 12, (s) => s.startingPowerUps.power, (s, i) => s.startingPowerUps.power = i),
	new NumberOption<SelectGameMode>(80, "Extra Speed", 0, 3, (s) => s.startingPowerUps.speed, (s, i) => s.startingPowerUps.speed = i),
	new NumberOption<SelectGameMode>(90, "Quick Bomb", 0, 6, (s) => s.startingPowerUps.quickBomb, (s, i) => s.startingPowerUps.quickBomb = i),
	new SimpleOption<SelectGameMode>(
		130,
		(selector) => {
			let acceptedCount: u8 = 0;
			for (let i = 0; i < 4; i++) {
				acceptedCount += selector.gamepadReady[i] ? 1 : 0;
			}

			return acceptedCount > 1 ? 'Start Game' : 'Start Game (WAITING)';
		},
		(selector, button) => {
			if (button != ButtonType.X) {
				return;
			}
			let acceptedCount: u8 = 0;
			for (let i = 0; i < 4; i++) {
				acceptedCount += selector.gamepadReady[i] ? 1 : 0;
			}

			if (acceptedCount > 1) {
				// @ts-ignore
				Math.seedRandom(u64(Math.random() * selector.tick * 31 + selector.rounds));
				selector.changer(
					new MultiplayerGame(
						selector.changer,
						selector.startingPowerUps,
						selector.gamepadReady[1],
						selector.gamepadReady[2],
						selector.gamepadReady[3],
						selector.rounds,
						selector.mapId,
						[Stats.VOID, Stats.VOID, Stats.VOID, Stats.VOID]
					)
				);
			}
		}
	),
	new SimpleOption<SelectGameMode>(
		140,
		(selector) => {
			return 'Return to Menu';
		},
		(selector, button) => {
			if (button != ButtonType.X) {
				return;
			}
			selector.changer(new MainMenu(selector.changer));
		}
	),
];

export class SelectGameMode extends GameState {
	tick: u32 = 0;
	lastGamepad: u8;
	startingPowerUps: StartingPowerUps = new StartingPowerUps();

	gamepadPlayer: StaticArray<bool> = new StaticArray(4);
	gamepadReady: StaticArray<bool> = new StaticArray(4);

	seletedOption: i8 = 0;
	rounds: u8 = 3;
	mapId: i8 = -1;

	constructor(changer: GameStateChanger) {
		super(changer);
		this.lastGamepad = load<u8>(w4.GAMEPAD1);
		this.gamepadReady[0] = true;
	}

	public update(): void {
		this.tick++;

		let name = 'VS! Game';
		setColors(4, 0, 0, 0);
		w4.text(name, w4.SCREEN_SIZE / 2 - (name.length * 8) / 2, 1);

		const walkFrame = RUN_ANIM_X[(this.tick / 6) % RUN_ANIM_X.length];

		for (let i: u8 = 0; i < 4; i++) {
			if (this.gamepadReady[i]) {
				setPlayerColor(i);
			} else {
				setColors(2, 2, 0, 2);
			}

			let center = 40 * (i + 1) - 20;

			w4.blitSub(
				Texture.PLAYER_TEX,
				center - 8,
				11,
				10,
				10,
				10 * (this.gamepadReady[i] ? walkFrame : 0),
				0,
				Texture.PLAYER_WIDTH,
				Texture.PLAYER_FLAGS
			);

			setColors(0, 4, 0, 0);
			Font.F4x6.drawCentered('Player ' + (i + 1).toString(), center, 12 + 12);
			setColors(0, this.gamepadReady[i] ? 3 : 2, 0, 0);
			Font.F4x6.drawCentered(this.gamepadReady[i] ? 'READY!' : 'Press X', center, 12 + 19);

			if (i != 0) {
				const gamepad = load<u8>(w4.GAMEPAD1 + i);

				if (!this.gamepadPlayer[i] && gamepad & w4.BUTTON_1) {
					this.gamepadReady[i] = !this.gamepadReady[i];
					this.gamepadPlayer[i] = true;
				} else {
					this.gamepadPlayer[i] = (gamepad & w4.BUTTON_1) != 0;
				}
			}
		}

		const map = MAPS[this.mapId != -1 ? this.mapId : (this.tick / 30) % MAPS.length];


		for (let x: u8 = 0; x < WORLD_SIZE; x++) {
			for (let y: u8 = 0; y < WORLD_SIZE; y++) {
				let color: u16 = map.layout[x + y * WORLD_SIZE] != 0 ? 3 : 1;

				for (let xi: u8 = 0; xi < 3; xi++) {
					for (let yi: u8 = 0; yi < 3; yi++) {
						w4.drawPoint(w4.FRAMEBUFFER, color, 100 + x * 3 + xi, 40 + y * 3 + yi);
					}
				}
			}
		}

		for (let i = 0; i < OPTIONS.length; i++) {
			setColors(0, this.seletedOption == i ? 4 : 2, 0, 0);
			const option = OPTIONS[i];
			let name = option.name(this);
			Font.F6x8.draw(name, 3 + 8, option.y);

			if (this.seletedOption == i) {
				const alt = (this.tick / 20) % 2 == 0;
				const altD = alt ? 0 : 2
				setColors(alt ? 4 : 3, 0, 0, 0);
				w4.text(">", 2 + altD, option.y);
			}
		}

		const gamepad = load<u8>(w4.GAMEPAD1);
		if (gamepad & w4.BUTTON_1 && (gamepad & w4.BUTTON_1) != (this.lastGamepad & w4.BUTTON_1)) {
			OPTIONS[this.seletedOption].use(this, ButtonType.X);
		} else if (gamepad & w4.BUTTON_2 && (gamepad & w4.BUTTON_2) != (this.lastGamepad & w4.BUTTON_2)) {
			OPTIONS[this.seletedOption].use(this, ButtonType.Z);
		} else if (gamepad & w4.BUTTON_LEFT && (gamepad & w4.BUTTON_LEFT) != (this.lastGamepad & w4.BUTTON_LEFT)) {
			OPTIONS[this.seletedOption].use(this, ButtonType.LEFT);
		} else if (gamepad & w4.BUTTON_RIGHT && (gamepad & w4.BUTTON_RIGHT) != (this.lastGamepad & w4.BUTTON_RIGHT)) {
			OPTIONS[this.seletedOption].use(this, ButtonType.RIGHT);
		} else if (gamepad & w4.BUTTON_DOWN && (gamepad & w4.BUTTON_DOWN) != (this.lastGamepad & w4.BUTTON_DOWN)) {
			this.seletedOption = min(this.seletedOption + 1, u8(OPTIONS.length - 1));
		} else if (gamepad & w4.BUTTON_UP && (gamepad & w4.BUTTON_UP) != (this.lastGamepad & w4.BUTTON_UP)) {
			this.seletedOption = max(this.seletedOption - 1, 0);
		}

		this.lastGamepad = gamepad;
	}
}
