import { MultiplayerGame } from "../game/main";
import { GameState, GameStateChanger } from "../gameState";
import * as Texture from "../texture";
import { VERSION_TEXT, setColors } from "../util";
import * as w4 from "../wasm4";
import * as Font from '../fonts';
import { SelectGameMode } from "./selectGame";
import { ButtonType, Option, SimpleOption } from "./options";
import { Credits } from "./credits";
import { MAPS, WORLD_SIZE } from "../game/worlds/world_vs";
import { World } from "../game/world";

const OPTIONS: StaticArray<Option<MainMenu>> = [
	new SimpleOption<MainMenu>(100, () => "VS! Game", (selector, button) => {
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
		const alt = (this.tick / 20) % 2 == 0;

		const sinVal = 0//<i32>(Math.sin(<f32>this.tick / 60.0) * 3 + 3)

		setColors(2, 3, 0, 4)
		w4.blit(Texture.LOGO_TEX, (w4.SCREEN_SIZE - 128) / 2, sinVal, Texture.LOGO_WIDTH, Texture.LOGO_HEIGHT, Texture.LOGO_FLAGS);
		

		w4.blitSub(Texture.LOGO_FLAME_TEX, (w4.SCREEN_SIZE - 128) / 2 + 75, sinVal, 24, Texture.LOGO_FLAME_HEIGHT, 
				alt ? 24 : 0, 0, Texture.LOGO_FLAME_WIDTH, Texture.LOGO_FLAME_FLAGS);


		setColors(0, 4, 0, 0)
		Font.F4x6.drawCentered(VERSION_TEXT, w4.SCREEN_SIZE / 2, 160 - 7)


		for (let i = 0; i < OPTIONS.length; i++) {
			setColors(this.seletedOption == i ? 4 : 2, 0, 0, 0);
			const option = OPTIONS[i];
			let name = option.name(this);

			w4.text(name, w4.SCREEN_SIZE / 2 - name.length * 4, option.y);
			if (this.seletedOption == i) {
				const altD = alt ? 0 : 2
				setColors(this.seletedOption == i ? alt ? 4 : 3 : 2, 0, 0, 0);
				w4.text(">", w4.SCREEN_SIZE / 2 - (name.length + 3) * 4 + altD, option.y);
				w4.text("<", w4.SCREEN_SIZE / 2 + (name.length + 1) * 4 - altD, option.y);
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

		//this.debugMap()
	}

	debugMap(): void {
		const map = MAPS[3];
		const world = World.fromMap(map)

		world.drawTiles(0, 0)
	}
}