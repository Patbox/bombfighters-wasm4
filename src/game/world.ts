import { Entity } from "./entity";
import { Tile } from "./tiles";
import * as Tiles from "./tiles";
import { runGC, setColors, setColorData, clamp16 } from "../util";
import { PIXEL_PER_TILE } from "./constants";
import * as w4 from '../wasm4';
import * as Texture from '../texture'
import { Map } from "./worlds/world_vs";

// @ts-ignore
@inline
export function packWorldPos(x: u16, y: u16): u32 {
	return u32(x) << 16 | y;
}

export class World {
	static fromMap(map: Map): World {
		const world = new World(map.width, map.height);
		world.load(map.layout)
		return world;
	}
	tiles: Uint8Array;
	readonly width: u16;
	readonly height: u16;
	private entityId: u32 = 0;

	readonly entities: Set<Entity> = new Set<Entity>();
	private entitiesArray: StaticArray<Entity> | null = null;

	constructor(width: u16, height: u16) {
		this.tiles = new Uint8Array(width * height);
		this.width = width;
		this.height = height;
	}
	@inline
	public getTile(x: u16, y: u16): Tile {
		return Tiles.TILE_ARRAY[this.getTileId(x, y)];
	}

	@inline
	public setTile(x: u16, y: u16, tile: Tile): void {
		this.setTileId(x, y, tile.id);
	}

	public setTileId(x: u16, y: u16, id: u8): void {
		if (x >= this.width || y >= this.height) {
			return;
		}

		this.tiles[this.index(x, y)] = id;
	}

	public getTileId(x: u16, y: u16): u8 {
		if (x >= this.width || y >= this.height) {
			return 0
		}

		return this.tiles[this.index(x, y)];
	}

	public load(bytes: StaticArray<u8>): void {
		for (let i = 0; i < bytes.length; i++) {
			this.tiles[i] = bytes[i];
		}
	}

	@inline
	private index(x: u16, y: u16): i32 {
		return x + y * this.width;
	}

	getEntityId(): u32 {
		return this.entityId++;
	}

	addEntity(entity: Entity): void {
		runGC();
		this.entities.add(entity);
		this.entitiesArray = null;
		runGC();
	}

	removeEntity(entity: Entity): void {
		runGC();
		this.entities.delete(entity);
		this.entitiesArray = null;
		runGC();
	}

	getEntities(): StaticArray<Entity> {
		let x = this.entitiesArray;
		if (!x) {
			x = StaticArray.fromArray(this.entities.values());
			this.entitiesArray = x;
			runGC();
		}

		return x;
	}

	drawTiles(cameraDeltaX: u16, cameraDeltaY: u16): void {
		const screenTiles: i16 = i8(w4.SCREEN_SIZE / PIXEL_PER_TILE + 1);

		for (let x: i16 = -1; x <= screenTiles; x++) {
			for (let y: i16 = 0; y <= screenTiles; y++) {
				const tile = this.getTile(clamp16(x, 0, this.width - 1), clamp16(y, 0, this.height - 1));
				setColorData(tile.color);

				let flags = 0;
				if (tile.randomRotation) {
					let val: i32 = (31 * x + 17 * y) / 2;

					if (val & 0x01) {
						flags |= w4.BLIT_ROTATE;
					}

					if (val & 0x02) {
						flags |= w4.BLIT_FLIP_X;
					}

					if (val & 0x04) {
						flags |= w4.BLIT_FLIP_Y;
					}
				}

				w4.blitSub(
					Texture.TILES_TEX,
					x * PIXEL_PER_TILE + cameraDeltaX,
					y * PIXEL_PER_TILE + cameraDeltaY,
					PIXEL_PER_TILE,
					PIXEL_PER_TILE,
					tile.texture * PIXEL_PER_TILE,
					0,
					Texture.TILES_WIDTH,
					tile.textureFlags | w4.BLIT_2BPP | flags
				);

				if (tile.border != Tiles.BorderType.NONE && x >= 0 && y >= 0 && x < i16(this.width) && y < i16(this.height)) {
					setColors(4, 4, 4, 4);

					for (let i: u8 = 0; i < 2; i++) {
						const dir = i == 0 ? -1 : 1;
						const xDelta = i == 0 ? 0 : PIXEL_PER_TILE - 1;

						const typeX = this.getTile(u16(x + dir), y);
						const typeY = this.getTile(x, u16(y + dir));

						if (
							!((i == 0 && x == 0) || (i == 1 && x == this.width - 1)) &&
							((tile.border == Tiles.BorderType.NON_COLLIDABLE && !typeX.collisions) || (tile.border == Tiles.BorderType.NON_SELF && typeX != tile))
						) {
							w4.vline(x * PIXEL_PER_TILE + cameraDeltaX + xDelta, y * PIXEL_PER_TILE + cameraDeltaY, PIXEL_PER_TILE);
						}

						if (
							!((i == 0 && y == 0) || (i == 1 && y == this.height - 1)) &&
							((tile.border == Tiles.BorderType.NON_COLLIDABLE && !typeY.collisions) || (tile.border == Tiles.BorderType.NON_SELF && typeY != tile))
						) {
							w4.hline(x * PIXEL_PER_TILE + cameraDeltaX, y * PIXEL_PER_TILE + cameraDeltaY + xDelta, PIXEL_PER_TILE);
						}
					}
				}
			}
		}
	}
}