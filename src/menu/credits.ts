import { MultiplayerGame, Stats } from '../game/main';
import { setPlayerColor } from '../game/player';
import { GameState, GameStateChanger } from '../gameState';
import * as Texture from '../texture';
import { setColors, zeroLeadingNumber } from '../util';
import * as w4 from '../wasm4';
import { SelectGameMode, StartingPowerUps } from './selectGame';
import * as Font from '../fonts';
import { MainMenu } from './main';


export class Credits extends GameState {
	lastGamepad: u8;


	constructor(changer: GameStateChanger) {
		super(changer);
		this.lastGamepad = load<u8>(w4.GAMEPAD1);
	}

	public update(): void {

		setColors(4, 0, 0, 0);
		let name = "Credits";
		w4.text(name, w4.SCREEN_SIZE / 2 - (name.length * 8) / 2, 1);

		setColors(0, 4, 0, 0);
		Font.F6x8.drawCentered("- Written by -", w4.SCREEN_SIZE / 2, 10);
		Font.F6x8.drawCentered("Patbox", w4.SCREEN_SIZE / 2, 20);
		Font.F6x8.drawCentered("- Fonts used -", w4.SCREEN_SIZE / 2, 40);
		Font.F6x8.drawCentered("Default WASM-4", w4.SCREEN_SIZE / 2, 50);
		Font.F6x8.drawCentered("OpenZoo by asie", w4.SCREEN_SIZE / 2, 60);

		setColors(4, 0, 0, 0);
		name = "> Return to Menu <";
		w4.text(name, w4.SCREEN_SIZE / 2 - (name.length * 8) / 2, 150);
		

		const gamepad = load<u8>(w4.GAMEPAD1);
		if (gamepad & w4.BUTTON_1 && (gamepad & w4.BUTTON_1) != (this.lastGamepad & w4.BUTTON_1)) {
			const x = new MainMenu(this.changer);
			x.seletedOption = 1;
			this.changer(x)
		}

		this.lastGamepad = gamepad;
	}
}
