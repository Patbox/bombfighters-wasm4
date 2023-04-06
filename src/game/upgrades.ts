import * as w4 from '../wasm4';
import * as Tiles from './tiles';

import * as Texture from '../texture';
import { CARDINAL_DIRECTIONS, clamp16, clamp32, clamp32f, dir, setColorData, setColors } from '../util';
import { PIXEL_PER_TILE } from './constants';
import { Entity, subPixel } from './entity';
import { Player } from './player';
import { World } from './world';

export function spawnUpgrade(world: World, x: u16, y: u16): void {
	if (Math.random() < 0.4) {
		switch (u8(Math.random() * 4)) {
			case 0:
				world.addEntity(new MoreBombs(world, x, y));
				break;
			case 1:
				world.addEntity(new MorePower(world, x, y));
				break;
			case 2:
				world.addEntity(new MoreSpeed(world, x, y));
				break;
			case 3:
				world.addEntity(new FasterExplosion(world, x, y));
				break;
		}
	}
}

export class UpgradeBase extends Entity {
	destroyed: bool = false;
	textureId: u8;
	constructor(world: World, id: u8, x: u16, y: u16) {
		super(world);
		this.textureId = id;
		this.setPos(x * PIXEL_PER_TILE + PIXEL_PER_TILE / 2, y * PIXEL_PER_TILE + PIXEL_PER_TILE / 2);
	}

	public explode(): void {
		this.world.removeEntity(this);
		this.destroyed = true;
	}

	public apply(player: Player): void {
		if (this.destroyed) return;
		this.applyImpl(player);
		this.explode();
	}

	protected applyImpl(player: Player): void {}

	public draw(deltaX: i16, deltaY: i16, frame: u64): void {
		let color: u8 = 2;

		if ((frame / 8) % 2 == 0) {
			color = 3;
		}
		setColors(color, 3, 0, 4);

		let flags = w4.BLIT_2BPP;

		w4.blitSub(
			Texture.POWERUPS_TEX,
			this.pixelX() + deltaX - 10 / 2,
			this.pixelY() + deltaY - 10 / 2,
			10,
			10,
			10 * this.textureId,
			0,
			Texture.POWERUPS_WIDTH,
			Texture.POWERUPS_FLAGS | flags
		);
	}
}

export class MoreBombs extends UpgradeBase {
	constructor(world: World, x: u16, y: u16) {
		super(world, 0, x, y);
	}

	protected applyImpl(player: Player): void {
		player.maxBombs++;
	}
}

export class MorePower extends UpgradeBase {
	constructor(world: World, x: u16, y: u16) {
		super(world, 1, x, y);
	}

	protected applyImpl(player: Player): void {
		player.explosionSize++;
	}
}

export class MoreSpeed extends UpgradeBase {
	constructor(world: World, x: u16, y: u16) {
		super(world, 2, x, y);
	}

	protected applyImpl(player: Player): void {
		player.speed = min(player.speed + 1, 3);
	}
}

export class FasterExplosion extends UpgradeBase {
	constructor(world: World, x: u16, y: u16) {
		super(world, 3, x, y);
	}

	protected applyImpl(player: Player): void {
		player.explosionTime = max(player.explosionTime - 1, 10);
	}
}
