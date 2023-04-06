import * as w4 from '../wasm4';

import { Entity, subPixel } from './entity';
import { clamp16, clamp32, clamp32f, dir, setColorData, setColors } from '../util';
import * as Tiles from './tiles';
import * as Texture from '../texture'
import { World } from './world';
import { PIXEL_PER_TILE, SUB_PIXELS, SUB_PIXELS_PER_TILE } from './constants';
import { Bomb } from './bomb';
import { UpgradeBase } from './upgrades';
import { MultiplayerGame, Stats } from './main';

export const RUN_ANIM_X: u8[] = [0, 1, 2, 3, 6, 5, 4];
const DEATH_ANIM: u8[] = [7, 8, 9, 10];

export class Player extends Entity {
	playerId: i8;

	velX: f32 = 0;
	velY: f32 = 0;

	runFrames: i32 = 0;
	isMoving: bool = false;
	facingDirX: i8 = 1;
	facingDirY: i8 = 0;

	isDead: bool = false;
	deathTimer: i32 = 0;

	explosionSize: u8 = 1;
	explosionTime: u8 = 16;
	maxBombs: u8 = 1;
	currentBombs: u8 = 0;
	speed: u8 = 0;
	stats: Stats = Stats.VOID

	constructor(world: World, id: u8) {
		super(world);
		this.playerId = id;
		this.height = 8;
	}

	onEntityCollision(entity: Entity, dirX: i8, dirY: i8): void {
		if (entity instanceof UpgradeBase) {
			(<UpgradeBase>entity).apply(this);
		}
	}

	handleInput(gamepad: u8): void {
		if (this.isDead) {
			return;
		}
		let dirX: i8 = 0;
		let dirY: i8 = 0;

		if (gamepad & w4.BUTTON_UP) {
			dirY -= 1;
		}

		if (gamepad & w4.BUTTON_DOWN) {
			dirY += 1;
		}

		if (gamepad & w4.BUTTON_LEFT) {
			dirX -= 1;
		}

		if (gamepad & w4.BUTTON_RIGHT) {
			dirX += 1;
		}

		let speed = 0.5 + this.speed / 4
		this.move(f32(dirX * speed), f32(dirY * speed))

		if (gamepad & w4.BUTTON_1) {
			const tileX = this.pixelX() / PIXEL_PER_TILE, tileY = this.pixelY() / PIXEL_PER_TILE;
			const ents = this.world.getEntities();
			let canSpawnBomb = this.currentBombs < this.maxBombs || this.noClip;


			for (let i = 0; i < ents.length; i++) {
				const entity = ents[i];

				if (entity instanceof Bomb && (<Player>(<Bomb>entity).owner == this) && entity.pixelX() / PIXEL_PER_TILE == tileX && entity.pixelY() / PIXEL_PER_TILE == tileY) {
					canSpawnBomb = false;
					break;
				}
			}
			
			if (canSpawnBomb) {
				const bomb = new Bomb(this, tileX, tileY, this.explosionSize, this.explosionTime * 15);
				this.currentBombs++;
				this.stats.bombs++;
				this.world.addEntity(bomb)
			}
		}
		
		if (dirX || dirY) {
			if (dirX) {
				this.facingDirX = dirX;
			}
			this.facingDirY = dirY;
			this.isMoving = this.lastMoveDelta[0] || this.lastMoveDelta[1];
		} else {
			this.isMoving = false;
		}

	}

	public explode(): void {
		if (!this.noClip && !this.isDead) {
			this.isDead = true;
			this.deathTimer = 30;
			this.stats.deaths++;
		}
	}

	public draw(deltaX: i16, deltaY: i16, frame: u64): void {
		if (this.isDead && this.deathTimer < 0) {
			return;
		}

		setPlayerColor(this.playerId);

		let flags = w4.BLIT_2BPP;

		if (this.facingDirX == -1) {
			flags |= w4.BLIT_FLIP_X;
		}

		let index = 0;

		if (this.isDead) {
			let frame = min(DEATH_ANIM.length - this.deathTimer / (30 / DEATH_ANIM.length), DEATH_ANIM.length - 1)
			index = DEATH_ANIM[frame]
			this.deathTimer--;
		} else if(this.isMoving) {
			let frame = this.runFrames++ / 6

			if (this.facingDirX != 0) {

				if (frame >= RUN_ANIM_X.length) {
					this.runFrames = 0;
					frame = 0;
				}

				index = RUN_ANIM_X[frame]
			}
		}
		
		w4.blitSub(Texture.PLAYER_TEX, this.pixelX() + deltaX - 10 / 2, 
		this.pixelY() + deltaY - 10 / 2, 
		10, 10, 10 * index,
		0,
		Texture.PLAYER_WIDTH, Texture.PLAYER_FLAGS | flags);
	}
}
export function setPlayerColor(playerId: u8): void {
	switch(playerId) {
		case 0:
			setColors(2, 3, 0, 4);
			break
		case 1:
			setColors(3, 2, 0, 4);
			break
		case 2:
			setColors(3, 4, 0, 2);
			break
		case 3:
			setColors(4, 2, 0, 3);
			break
	}
}

