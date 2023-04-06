import * as w4 from './wasm4';
import * as Texture from './texture';

export class Font {
	readonly texture: usize;
	readonly width: u32;
	readonly height: u32;
	readonly charHeight: u32;
	readonly charWidth: u32;
	readonly columns: u32;
	flags: u32;
	
	constructor(texture: usize, flags: u32, width: u32, height: u32, charWidth: u32, charHeight: u32, columns: u32) {
		this.texture = texture;
		this.width = width;
		this.height = height;
		this.flags = flags;
		this.charHeight = charHeight;
		this.charWidth = charWidth
		this.columns = columns
	}


	public getWidth(text: string): u32 {
		return this.charWidth * text.length;
	}
	

	public draw(text: string, x: u32, y: u32): void {
		for (let i = 0; i < text.length; i++) {
			let char = text.charCodeAt(i);

			const indexX: u32 = char % this.columns;
			const indexY: u32 = char / this.columns;

			w4.blitSub(this.texture, x, y, this.charWidth, this.charHeight, indexX * this.charWidth, indexY * this.charHeight, this.width, this.flags)

			x += this.charWidth;
		}
	}

	public drawCentered(text: string, x: u32, y: u32): void {
		const width = this.getWidth(text);

		this.draw(text, x - width / 2, y)
	}
}

export const F6x10 = new Font(Texture.FONT_6X10_TEX,Texture.FONT_6X10_FLAGS, Texture.FONT_6X10_WIDTH, Texture.FONT_6X10_HEIGHT, 6, 10, 32)
export const F6x8 = new Font(Texture.FONT_6X8_TEX,Texture.FONT_6X8_FLAGS, Texture.FONT_6X8_WIDTH, Texture.FONT_6X8_HEIGHT, 6, 8, 32)
export const F4x8 = new Font(Texture.FONT_4X8_TEX,Texture.FONT_4X8_FLAGS, Texture.FONT_4X8_WIDTH, Texture.FONT_4X8_HEIGHT, 4, 8, 32)
export const F4x6 = new Font(Texture.FONT_4X6_TEX,Texture.FONT_4X6_FLAGS, Texture.FONT_4X6_WIDTH, Texture.FONT_4X6_HEIGHT, 4, 6, 32)