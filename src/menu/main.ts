import { MultiplayerGame } from "../game/main";
import { GameState, GameStateChanger } from "../gameState";
import * as Texture from "../texture";
import { VERSION_TEXT, setColors } from "../util";
import * as w4 from "../wasm4";
import * as Font from '../fonts';
import { SelectGameMode } from "./selectGame";
import { ButtonType, Option, SimpleOption } from "./options";
import { Credits } from "./credits";

const OPTIONS: StaticArray<Option<MainMenu>> = [
	new SimpleOption<MainMenu>(100, () => "VS Game!", (selector, button) => {
		if (button == ButtonType.X) {
			// @ts-ignore
			Math.seedRandom(selector.tick);
			selector.changer(new SelectGameMode(selector.changer));
		}
	}),
	new SimpleOption<MainMenu>(110, () => "Credits", (selector, button) => {
		if (button == ButtonType.X) {
			selector.changer(new Credits(selector.changer));
		}
	})
]

export class MainMenu extends GameState {
	tick: u32 = 0;
	lastGamepad: u8;
	seletedOption: i8 = 0;
	constructor(changer: GameStateChanger) {
		super(changer);
		this.lastGamepad = load<u8>(w4.GAMEPAD1);
	}

	public update(): void {
		this.tick++;

		setColors(2, 3, 0, 4)
		w4.blit(Texture.LOGO_TEX, (w4.SCREEN_SIZE - 128) / 2, 0, Texture.LOGO_WIDTH, Texture.LOGO_HEIGHT, Texture.LOGO_FLAGS);
		
		setColors((this.tick / 20) % 2 == 0 ? 4 : 3, 0, 0, 0)
		
		setColors(0, 4, 0, 0)
		Font.F4x6.drawCentered(VERSION_TEXT, w4.SCREEN_SIZE / 2, 160 - 7)


		for (let i = 0; i < OPTIONS.length; i++) {
			setColors(this.seletedOption == i ? 4 : 2, 0, 0, 0);
			const option = OPTIONS[i];
			let name = option.name(this);
			if (this.seletedOption == i) {
				name = '> ' + name + " <";
			}

			w4.text(name, w4.SCREEN_SIZE / 2 - name.length * 4, option.y);
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