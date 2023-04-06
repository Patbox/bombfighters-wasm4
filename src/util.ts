import * as w4 from "./wasm4";

export const VERSION_TEXT = "v0.1.1 by Patbox";

export const CARDINAL_DIRECTIONS: StaticArray<StaticArray<i8>> = [
	[0, 1],
	[0, -1],
	[1, 0],
	[-1, 0],
]

// @ts-ignore
@inline
export function runGC(): void {
	// @ts-ignore
	__collect();
}

export function clamp32f(input: f32, min: f32, max: f32): f32 {
	if (input < min) {
		return min;
	}
	if (input > max) {
		return max;
	}

	return input;
}

export function clamp32(input: i32, min: i32, max: i32): i32 {
	if (input < min) {
		return min;
	}
	if (input > max) {
		return max;
	}

	return input;
}

export function clamp16(input: i16, min: i16, max: i16): i16 {
	if (input < min) {
		return min;
	}
	if (input > max) {
		return max;
	}

	return input;
}

export function dir<T>(num: T): i8 {
	if (num == 0) {
		return 0;
	}

	return f32(num) > 0 ? 1 : -1;
}

export function palette(color1: u32, color2: u32, color3: u32, color4: u32): void	 {
	store<u32>(w4.PALETTE, color1, 0 * sizeof<u32>());
	store<u32>(w4.PALETTE, color2, 1 * sizeof<u32>());
	store<u32>(w4.PALETTE, color3, 2 * sizeof<u32>());
	store<u32>(w4.PALETTE, color4, 3 * sizeof<u32>());
}

export function colorData(color1: u8, color2: u8, color3: u8, color4: u8): u16 {
	return u16(color4) << 12 | u16(color3) << 8 | color2 << 4 | color1 << 0;
}

export function setColorData(color: u16): void {
	store<u16>(w4.DRAW_COLORS, color);
}

export function setColors(color1: u8, color2: u8, color3: u8, color4: u8): void {
	store<u16>(w4.DRAW_COLORS, colorData(color1, color2, color3, color4));
}

// @ts-ignore
@final
export class PbSet<T> {
	private value: StaticArray<T> = new StaticArray<T>(256);
	size: i32 = 0;
	defaultValue: T;

	constructor(defaultValue: T) {
		this.defaultValue = defaultValue;
	}

	has(value: T): bool {
		for (let i = 0; i < this.size; i++) {
			const cur = this.value[i];

			if (cur && cur == value) {
				return true;
			}
		}
		return false;
	}
	add(value: T): void {
		if (!this.has(value)) {
			if (this.value.length <= this.size) {
				runGC();
				const old = this.value;
				this.value = new StaticArray<T>(this.value.length + 64);
				for (let index = 0; index < old.length; index++) {
					this.value[index] = old[index];
				}
				runGC();
			}
			this.value[this.size] = value;

			this.size++;
		}
	}

	clear(): void {
		for (let i = 0; i < this.size; i++) {
			this.value[i] = this.defaultValue;
		}
		this.size = 0;
	}

	values(): Array<T | null> {
		return this.value.slice(0, this.size);
	}
}

export function zeroLeadingNumber<T extends number>(number: T, length: i32): string {
	let st = number.toString();
	length -= st.length;

	while(length-- > 0) {
		st = "0" + st;
	}
	return st;
}