import { MultiplayerGame, Stats } from '../game/main';
import { setPlayerColor } from '../game/player';
import { GameState, GameStateChanger } from '../gameState';
import * as Texture from '../texture';
import { setColors, zeroLeadingNumber } from '../util';
import * as w4 from '../wasm4';
import { SelectGameMode, StartingPowerUps } from './selectGame';
import * as Font from '../fonts';


export class WinScreen extends GameState {
	tick: u32 = 0;
	lastGamepad: u8;
	stats: StaticArray<Stats>;
	previousRounds: u8;
	playerCount: u8;
	upgrades: StartingPowerUps;


	constructor(changer: GameStateChanger, stats: StaticArray<Stats>, previousRounds: u8, upgrades: StartingPowerUps) {
		super(changer);
		this.lastGamepad = load<u8>(w4.GAMEPAD1);
		this.stats = stats;
		this.previousRounds = previousRounds;
		this.playerCount = 0;
		this.upgrades = upgrades;
		for (let i = 0; i < 4; i++) {
			if (stats[i].score != -1) {
				this.playerCount++;
			}
		}
	}

	public update(): void {
		this.tick++;

		for (let i: u8 = 0; i < 4; i++) {
			if (this.stats[i].score == -1) {
				continue;
			}

			let center = 160 / this.playerCount * (i + 1) - 80 / this.playerCount;

			setPlayerColor(i);

			w4.blitSub(Texture.PLAYER_TEX, center - 5, 20, 10, 10, 10 * 1, 0, Texture.PLAYER_WIDTH, Texture.PLAYER_FLAGS);

			setColors(0, 4, 0, 0);
			Font.F4x6.drawCentered('Player ' + (i + 1).toString(), center, 30);
			Font.F4x6.drawCentered('Score:' + zeroLeadingNumber(this.stats[i].score, 2), center, 40);
			Font.F4x6.drawCentered('Bombs:' + zeroLeadingNumber(this.stats[i].bombs, 3), center, 50);
			Font.F4x6.drawCentered('Kills:' + zeroLeadingNumber(this.stats[i].kills, 3), center, 60);
			Font.F4x6.drawCentered('Deaths:' + zeroLeadingNumber(this.stats[i].deaths, 3), center, 70);
			//setColors(0, 3, 0, 0);
			//Font.F4x6.drawCentered(this.gamepadReady[i] ? 'READY!' : 'Press X', center, 12 + 19);

			if (this.stats[i].score == this.previousRounds) {
				setColors(2, 3, 0, 4);
				w4.blitSub(Texture.PLAYER_TEX, center - 5, 10, 10, 10, 10 * 11, 0, Texture.PLAYER_WIDTH, Texture.PLAYER_FLAGS);
			}
		}


	
		setColors(4, 0, 0, 0);

		let name = "Final Score!";
		w4.text(name, w4.SCREEN_SIZE / 2 - (name.length * 8) / 2, 1);

		name = "> Press X to continue <";
		w4.text(name, w4.SCREEN_SIZE / 2 - (name.length * 8) / 2, 150);
		

		const gamepad = load<u8>(w4.GAMEPAD1);
		if (gamepad & w4.BUTTON_1 && (gamepad & w4.BUTTON_1) != (this.lastGamepad & w4.BUTTON_1)) {
			const select = new SelectGameMode(this.changer);
			select.rounds = this.previousRounds;
			select.gamepadReady[1] = this.stats[1].score != -1;
			select.gamepadReady[2] = this.stats[2].score != -1;
			select.gamepadReady[3] = this.stats[3].score != -1;
			select.startingPowerUps = this.upgrades;
			this.changer(select);
		}

		this.lastGamepad = gamepad;
	}
}
