import * as Texture from '../texture';
import { colorData } from '../util';
import * as w4 from '../wasm4';

export const TILE_ARRAY = new Array<Tile>(256);

let currentId: u8 = 0;

export enum BorderType {
	NONE,
	NON_SELF,
	NON_COLLIDABLE
}

export class Tile {
	id: u8;
	texture: u16;
	collisions: bool;
	randomRotation: bool;
	color: u16;
	textureFlags: u32;
	border: BorderType;

	constructor(textureIndex: u16, color: u16, flags: u32, collisions: bool, randomRot: bool, border: BorderType) {
		this.id = currentId++;
		this.texture = textureIndex;
		this.collisions = collisions;
		this.color = color;
		this.textureFlags = flags;
		this.border = border;
		this.randomRotation = randomRot;
		TILE_ARRAY[this.id] = this;
	}
}

export const EMPTY = new Tile(0, 0, 0, false, false, BorderType.NONE);
TILE_ARRAY.fill(EMPTY);
export const WALL = new Tile(1, colorData(3, 2, 4, 0), 0, true, false, BorderType.NON_SELF);
export const BOULDER = new Tile(2, colorData(3, 2, 4, 0), 0, true, true, BorderType.NON_COLLIDABLE);
//export const BOULDER = new Tile(4, colorData(3, 4, 2, 0), 0, true, false, BorderType.NONE);


export const FINAL_ID = currentId;
