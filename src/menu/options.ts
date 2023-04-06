export enum ButtonType {
	X,
	Z,
	LEFT,
	RIGHT,
}

export class Option<T> {
	readonly y: u8;

	constructor(y: u8) {
		this.y = y;
	}

	name(selector: T): string {
		return '';
	}
	use(selector: T, button: ButtonType): void {}
}

export class SimpleOption<T> extends Option<T> {
	nameRed: (selector: T) => string;
	useRed: (selector: T, button: ButtonType) => void;
	constructor(y: u8, name: (selector: T) => string, call: (selector: T, button: ButtonType) => void) {
		super(y);
		this.nameRed = name;
		this.useRed = call;
	}

	name(selector: T): string {
		return this.nameRed(selector);
	}

	use(selector: T, button: ButtonType): void {
		return this.useRed(selector, button);
	}
}

export class NumberOption<T> extends Option<T> {
	baseName: string;
	setter: (selector: T, i: i8) => void;
	getter: (selector: T) => i8;
	min: i8;
	max: i8;
	constructor(y: u8, name: string, min: i8, max: i8, getter: (selector: T) => i8, setter: (selector: T, i: i8) => void) {
		super(y);
		this.baseName = name;
		this.getter = getter;
		this.setter = setter;
		this.min = min;
		this.max = max;
	}

	name(selector: T): string {
		return this.baseName + ': ' + this.getter(selector).toString();
	}

	use(selector: T, button: ButtonType): void {
		if (button == ButtonType.RIGHT || button == ButtonType.X) {
			this.setter(selector, min(this.getter(selector) + 1, this.max));
		} else {
			this.setter(selector, max(this.getter(selector) - 1, this.min));
		}
	}
}