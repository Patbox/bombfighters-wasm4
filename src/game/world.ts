import { Bomb } from "./bomb";
import { Entity } from "./entity";
import { Tile } from "./tiles";
import * as Tiles from "./tiles";
import { runGC } from "../util";
// @ts-ignore
@inline
export function packWorldPos(x: u16, y: u16): u32 {
	return u32(x) << 16 | y;
}

export class World {
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
}