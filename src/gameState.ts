

export type GameStateChanger = (state: GameState) => void;

export class GameState {
	changer: GameStateChanger;
	constructor(changer: GameStateChanger) {
		this.changer = changer;
	}

	public update(): void {};
}
