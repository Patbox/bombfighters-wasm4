import { MultiplayerGame } from './game/main';
import { GameState, GameStateChanger } from './gameState';
import { MainMenu } from './menu/main';
import { CARDINAL_DIRECTIONS, clamp16, palette, runGC, setColorData, setColors } from './util';
import * as w4 from './wasm4';


// @ts-ignore
Math.seedRandom(32);
palette(0xfff6d3, 0xf9a875, 0xeb6b6f, 0x7c3f58);


let currentState: GameState;

const changer: GameStateChanger = (x: GameState) => {
	currentState = x;
}

currentState = new MainMenu(changer);//new MultiplayerGame(); 

export function update(): void {
	runGC();
	currentState.update();
}

