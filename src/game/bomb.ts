import * as w4 from '../wasm4';
import * as Tiles from './tiles';

import * as Texture from '../texture'
import { CARDINAL_DIRECTIONS, clamp16, clamp32, clamp32f, dir, setColorData, setColors } from '../util';
import { PIXEL_PER_TILE } from "./constants";
import { Entity, subPixel } from "./entity";
import { Player } from './player';
import { spawnUpgrade } from './upgrades';

export class Bomb extends Entity {
	owner: Player;
	timer: i32;
	size: u8;

	dirLenght: StaticArray<u8> = new StaticArray(CARDINAL_DIRECTIONS.length);
	constructor(owner: Player, x: u16, y: u16, size: u8, explosionTime: i32) {
		super(owner.world);
		this.owner = owner;
		this.size = size;
		this.timer = explosionTime;
		this.setPos(x * PIXEL_PER_TILE + PIXEL_PER_TILE / 2, y * PIXEL_PER_TILE + PIXEL_PER_TILE / 2);
		this.isSolid = true;
	}

	public tick(): void {
		if (this.timer == 0) {
			this.explode();
		} else if (this.timer < -20) {
			this.world.removeEntity(this);
		}
		this.timer--;
	}

	public explode(): void {
		if (this.timer < 0) {
			return;
		}
		
		this.timer = -1;
		this.owner.currentBombs--;
		const xBase = this.pixelX() / PIXEL_PER_TILE;
		const yBase = this.pixelY() / PIXEL_PER_TILE;

		const ents = this.world.getEntities();
		for (let e = 0; e < ents.length; e++) {
			const entity = ents[e];

			if (entity.intersects(xBase * PIXEL_PER_TILE + 2, yBase * PIXEL_PER_TILE + 2, xBase * PIXEL_PER_TILE + PIXEL_PER_TILE - 2, yBase * PIXEL_PER_TILE + PIXEL_PER_TILE - 2)) {
				entity.explode();

				if (entity != this.owner && entity instanceof Player && !(<Player>entity).isDead) {
					this.owner.stats.kills++;
				}
			}
		}
		
		for(let d = 0; d < CARDINAL_DIRECTIONS.length; d++) {

			for (let i: u8 = 1; i <= this.size; i++) {
				const dir = CARDINAL_DIRECTIONS[d];
				const tileX = u16(xBase + dir[0] * i), tileY = u16(yBase + dir[1] * i);
				const tile = this.world.getTile(tileX, tileY);
				
				if (tile == Tiles.BOULDER) {
					this.world.setTile(tileX, tileY, Tiles.EMPTY);
					this.dirLenght[d] = i;
					

					spawnUpgrade(this.world, tileX, tileY)
					break;
				} else if (tile != Tiles.EMPTY) {
					break;
				}

				for (let e = 0; e < ents.length; e++) {
					const entity = ents[e];

					if (entity.intersects(tileX * PIXEL_PER_TILE+ 2, tileY * PIXEL_PER_TILE+ 2, tileX * PIXEL_PER_TILE + PIXEL_PER_TILE - 2, tileY * PIXEL_PER_TILE + PIXEL_PER_TILE - 2)) {
						entity.explode();
						if (entity != this.owner && entity instanceof Player && !(<Player>entity).isDead) {
							this.owner.stats.kills++;
						}
					}
				}
				this.dirLenght[d] = i;
			}
		}
	}
	

	public draw(deltaX: i16, deltaY: i16, frame: u64): void {
		let color: u8 = 4;
		
		if (this.timer < 30) {
			if (this.timer / 5 % 2 == 0) {
				color = 3;
			}
		} else if (this.timer < 60) {
			if (this.timer / 10 % 2 == 0) {
				color = 3;
			}
		} else if (this.timer < 60 * 32) {
			if (this.timer / 20 % 2 == 0) {
				color = 3;
			}
		}else if (this.timer < 60 * 3) {
			if (this.timer / 30 % 2 == 0) {
				color = 3;
			}
		}


		setColors(2, 3, 0, color);

		let flags = w4.BLIT_2BPP;
	
		let index = 0;

		if (this.timer < 0) {
			index = 1;
		}

		w4.blitSub(Texture.BOMB_TEX, this.pixelX() + deltaX - 10 / 2, 
		this.pixelY() + deltaY - 10 / 2, 
		10, 10, 10 * index,
		0,
		Texture.BOMB_WIDTH, Texture.BOMB_FLAGS | flags);

		if (this.timer < 0) {
			for(let d = 0; d < CARDINAL_DIRECTIONS.length; d++) {
				const dir = CARDINAL_DIRECTIONS[d];

				let flags = w4.BLIT_2BPP;

				if (dir[0] == -1 || dir[1] == 1) {
					flags |= w4.BLIT_FLIP_X;
				}


				if (dir[1]) {
					flags |= w4.BLIT_ROTATE;
				}

				for (let i: u8 = 1; i <= this.dirLenght[d]; i++) {
					let index = 2;

					if (i == this.dirLenght[d]) {
						index = 3;
					}
	

					w4.blitSub(Texture.BOMB_TEX, this.pixelX() + deltaX - 10 / 2 + dir[0] * i * PIXEL_PER_TILE, 
					this.pixelY() + deltaY - 10 / 2 + dir[1] * i * PIXEL_PER_TILE, 
					10, 10, 10 * index,
					0,
					Texture.BOMB_WIDTH, Texture.BOMB_FLAGS | flags);
				}
			}	
		}
	}
}