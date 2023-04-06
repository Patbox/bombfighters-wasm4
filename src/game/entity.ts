import { World, packWorldPos } from './world';
import * as Tiles from './tiles';
import * as w4 from '../wasm4';
import { dir,  PbSet, runGC } from '../util';
import { SUB_PIXELS, SUB_PIXELS_PER_TILE } from './constants';

// @ts-ignore
@inline
export function alignSubPixel(value: i32): i32 {
	return value / SUB_PIXELS * SUB_PIXELS
}

// @ts-ignore
@inline
export function subPixel(value: f32): i32 {
	return i32(value * SUB_PIXELS);
}

const collidedTiles = new PbSet<u32>(0);
const collidedEntities = new PbSet<Entity | null>(null);

export class Entity {
	readonly id: u32;
	readonly world: World;
	posX: i32 = 0;
	posY: i32 = 0;
	noClip: bool = false;

	isSolid: bool = false;

	width: u16 = 8;
	height: u16 = 8;
	lastMoveDelta: StaticArray<i32> = [0, 0]

	constructor(world: World) {
		this.world = world;
		this.id = world.getEntityId();
	}

	public tick(): void {}

	public move(x: f32, y: f32): void {
		if (x == 0 && y == 0) {
			return;
		}

		if (this.noClip) {
			this.posX += subPixel(x);
			this.posY += subPixel(y);
			return;
		}

		const dirX = dir(x);
		const dirY = dir(y);

		const length = sqrt(x * x + y * y);
		const lengthSqrd = subPixel(length) * subPixel(length);
		const rayNormX: i32 = subPixel(x / length);
		const rayNormY: i32 = subPixel(y / length);
		let rayPosX: i32 = this.posX;
		let rayPosY: i32 = this.posY;
		let rayDeltaX: i32 = 0,
			rayDeltaY: i32 = 0;

		let vStepX: i32 = rayNormX / 10,
			vStepY: i32 = rayNormY / 10;

		const width = subPixel(f32(this.width) / 2);
		const height = subPixel(f32(this.height) / 2);

		const entities = this.world.getEntities();

		while (rayDeltaX * rayDeltaX + rayDeltaY * rayDeltaY < lengthSqrd) {
			if (vStepX == 0 && vStepY == 0) {
				break;
			}

			if (abs(rayDeltaX) >= abs(subPixel(x))) {
				vStepX = 0;
			}

			if (abs(rayDeltaY) >= abs(subPixel(y))) {
				vStepY = 0;
			}

			let l = i32(sqrt(f32 (vStepY * vStepY + vStepX * vStepX)) * 3) 
			const delta = l

			for (let xSize = -width; xSize < width; xSize += SUB_PIXELS) {
				for (let ySize = -height; ySize < height; ySize += SUB_PIXELS) {
					const tile = this.world.getTile(u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE));
					const tileX = this.world.getTile(u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + ySize) / SUB_PIXELS_PER_TILE));
					//const tileX_yS1 = this.world.getTile(u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + ySize + delta) / SUB_PIXELS_PER_TILE));
					//const tileX_yS2 = this.world.getTile(u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + ySize - delta) / SUB_PIXELS_PER_TILE));
					const tileY = this.world.getTile(u16((rayPosX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE));
					//const tileY_xS1 = this.world.getTile(u16((rayPosX + xSize + delta) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE));
					//const tileY_xS2 = this.world.getTile(u16((rayPosX + xSize - delta) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE));


					let packetPos = packWorldPos(u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE));

					if (!collidedTiles.has(packetPos)) {
						this.onTileCollision(tile, u16((rayPosX + vStepX + xSize) / SUB_PIXELS_PER_TILE), u16((rayPosY + vStepY + ySize) / SUB_PIXELS_PER_TILE), dir(vStepX), dir(vStepY));
						collidedTiles.add(packetPos);
					}


					if (tile.collisions) {
						if (tileX.collisions) {
							/*if (!tileX_yS1.collisions) {
								rayPosY += l;
								vStepY = 0;
							} else if (!tileX_yS2.collisions) {
								rayPosY -= l;
								vStepY = 0;
							} */

							vStepX = 0;
						}

					
						if (tileY.collisions) {
							/*if (!tileY_xS1.collisions) {
								rayPosX += l;
								vStepX = 0;
							} else if (!tileY_xS2.collisions) {
								rayPosX -= l;
								vStepX = 0;
							} */

							vStepY = 0;
						}

						if (vStepX == 0 && vStepY == 0) {
							break;
						}
					}
				}
			}

			{
				const xStart = (rayPosX + vStepX - width) / SUB_PIXELS;
				const xStart0 = (rayPosX - width) / SUB_PIXELS;
				const yStart = (rayPosY + vStepY - height) / SUB_PIXELS + 1;
				const yStart0 = (rayPosY - height) / SUB_PIXELS + 1;
				const xEnd = (rayPosX + vStepX + width) / SUB_PIXELS;
				const xEnd0 = (rayPosX + width) / SUB_PIXELS;
				const yEnd = (rayPosY + vStepY + height) / SUB_PIXELS - 1;
				const yEnd0 = (rayPosY + height) / SUB_PIXELS - 1;

				for (let i = 0; i < entities.length; i++) {
					const entity = entities[i];

					if (entity == this) {
						continue;
					}

					const noCurrentCollision = !entity.intersects(xStart0, yStart0, xEnd0, yEnd0);

					if (entity.intersects(xStart, yStart, xEnd, yEnd)) {
						let eDirX: i8 = 0,
							eDirY: i8 = 0;

						if (vStepX) {
							if (entity.intersects(xStart, yStart0, xEnd, yEnd0)) {
								if (noCurrentCollision && (entity.colidesWith(this, dirX, 0) || this.colidesWith(entity, dirX, 0))) {
									vStepX = 0;
								}
								eDirX = dirX;
							}
						}

						if (vStepY) {
							if (entity.intersects(xStart0, yStart, xEnd0, yEnd)) {
								if (noCurrentCollision && (entity.colidesWith(this, 0, dirY) || this.colidesWith(entity, 0, dirY))) {
									vStepY = 0;
								}
								eDirY = dirY;
							}
						}

						if (!collidedEntities.has(entity)) {
							this.onEntityCollision(entity, eDirX, eDirY);
							collidedEntities.add(entity);
						}
					}
				}

				if (vStepX == 0 && vStepY == 0) {
					break;
				}
			}

			rayPosX += vStepX;
			rayPosY += vStepY;
			rayDeltaX += vStepX;
			rayDeltaY += vStepY;
		}
		runGC();
		collidedEntities.clear()
		collidedTiles.clear();
		runGC();
		this.lastMoveDelta[0] = this.posX - rayPosX;
		this.lastMoveDelta[1] = this.posY - rayPosY;
		this.posX = rayPosX;
		this.posY = rayPosY;
	}

	onTileCollision(tile: Tiles.Tile, x: u16, y: u16, dirX: i8, dirY: i8): void {}

	onEntityCollision(entity: Entity, dirX: i8, dirY: i8): void {}

	public colidesWith(entity: Entity, dirX: i8, dirY: i8): bool {
		return entity.isSolid;
	}

	public explode(): void {
		
	}

	intersects(startX: i32, startY: i32, endX: i32, endY: i32): bool {
		const rWidth = subPixel(f32(this.width) / 2);
		const rHeight = subPixel(f32(this.height) / 2);

	return !(
			(this.posX + rWidth) / SUB_PIXELS < startX ||
			(this.posY + rHeight) / SUB_PIXELS < startY ||
			(this.posX - rWidth) / SUB_PIXELS > endX ||
			(this.posY - rHeight) / SUB_PIXELS > endY
		);
	}

	intersectsF(startX: f32, startY: f32, endX: f32, endY: f32): bool {
		const rWidth = this.renderWidth();
		const rHeight = this.renderHeight();
		return !(
			floor(f32(this.posX) / SUB_PIXELS + rWidth / 2) < startX ||
			floor(f32(this.posY) / SUB_PIXELS + rHeight / 2) < startY ||
			ceil(f32(this.posX) / SUB_PIXELS - rWidth / 2) > endX ||
			ceil(f32(this.posY) / SUB_PIXELS - rHeight / 2) > endY
		);
	}

	renderWidth(): f32 {
		return this.width;
	}

	renderHeight(): f32 {
		return this.height;
	}

	public setPos(x: f32, y: f32): void {
		this.posX = subPixel(x);
		this.posY = subPixel(y);
	}

	public pixelX(): i16 {
		return i16(this.posX / SUB_PIXELS);
	}

	public pixelY(): i16 {
		return i16(this.posY / SUB_PIXELS);
	}

	public draw(deltaX: i16, deltaY: i16, frame: u64): void {
		
	}
}
