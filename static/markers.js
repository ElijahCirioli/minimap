class Marker {
	constructor(pos) {
		this.pos = pos;
		this.type = undefined;
		this.iconPath = undefined;
		this.icon = undefined;
	}

	addToMap(map, imagePath) {
		this.icon = new google.maps.Marker({
			position: this.pos,
			map: map,
			icon: {
				url: imagePath,
				scaledSize: new google.maps.Size(32, 32),
				anchor: new google.maps.Point(16, 16),
			},
			animation: google.maps.Animation.DROP,
		});
	}
}

class BikeRack extends Marker {
	constructor(pos, map) {
		super(pos);
		this.type = "BikeRack";
		this.addToMap(map, "icons/bike-rack.png");
	}
}

class Restroom extends Marker {
	constructor(pos, map) {
		super(pos);
		this.type = "Restroom";
		this.addToMap(map, "icons/restroom.png");
	}
}

class PostalDropBox extends Marker {
	constructor(pos, map) {
		super(pos);
		this.type = "PostalDropBox";
		this.addToMap(map, "icons/postal-drop-box.png");
	}
}

class DrinkingFountain extends Marker {
	constructor(pos, map) {
		super(pos);
		this.type = "DrinkingFountain";
		this.addToMap(map, "icons/drinking-fountain.png");
	}
}

class VendingMachine extends Marker {
	constructor(pos, map) {
		super(pos);
		this.type = "VendingMachine";
		this.addToMap(map, "icons/vending-machine.png");
	}
}
