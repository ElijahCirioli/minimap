let map, userMarker, locationSearch;
let positionWatchId;
let userId;

const iconPaths = {
	BikeRack: "icons/bike-rack.png",
	Restroom: "icons/restroom.png",
	PostalDropBox: "icons/postal-drop-box.png",
	DrinkingFountain: "icons/drinking-fountain.png",
	VendingMachine: "icons/vending-machine.png",
	InterestPoint: "icons/interest-point.png",
};

const markerAttributes = {
	BikeRack: [{ name: "Covered", type: "Bool" }],
	Restroom: [
		{ name: "Single user", type: "Bool" },
		{ name: "Gender inclusive", type: "Bool" },
		{ name: "Baby-changing station", type: "Bool" },
		{ name: "Sanitary products", type: "Bool" },
		{ name: "Free to use", type: "Bool" },
	],
	PostalDropBox: [{ name: "Collection time", type: "ShortString" }],
	DrinkingFountain: [{ name: "Water bottle filler", type: "Bool" }],
	VendingMachine: [
		{ name: "Drinks", type: "Bool" },
		{ name: "Candy", type: "Bool" },
		{ name: "Food", type: "Bool" },
		{ name: "Accepts card", type: "Bool" },
		{ name: "Accepts cash", type: "Bool" },
	],
	InterestPoint: [
		{ name: "Name", type: "ShortString" },
		{ name: "Description", type: "LongString" },
	],
};

function createMap() {
	// create google maps object
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: 44.565288, lng: -123.278921 },
		zoom: 17,
		zoomControl: true,
		zoomControlOptions: {
			position: google.maps.ControlPosition.LEFT_BOTTOM,
		},
		mapTypeControl: false,
		scaleControl: false,
		streetViewControl: false,
		rotateControl: true,
		fullscreenControl: false,
	});

	// setup location search API
	setupLocationSearch();

	// try to get the current user position
	startLocationTracking();
}

function setupLocationSearch() {
	// create location search object
	const options = {
		componentRestrictions: { country: "us" },
		fields: ["name", "geometry"],
		strictBounds: false,
		types: ["establishment"],
	};
	locationSearch = new google.maps.places.Autocomplete($("#location-search")[0], options);
	locationSearch.bindTo("bounds", map);

	// make sure the form won't cause the page to reload
	$("#location-search-form").on("submit", (e) => {
		e.preventDefault();
	});

	// trigger when a place is selected
	locationSearch.addListener("place_changed", () => {
		const place = locationSearch.getPlace();

		// try to move the camera there
		if (place.geometry && place.geometry.location) {
			map.setCenter(place.geometry.location);
			map.setZoom(17);
			$("#location-search").val("");
		} else if (place.geometry && place.geometry.viewport) {
			map.fitBounds(place.geometry.viewport);
			$("#location-search").val("");
		} else {
			alert("No location data available for this place");
		}
	});
}

function updateUserMarker(pos) {
	if (userMarker) {
		userMarker.setPosition(pos);
	} else {
		// create marker
		userMarker = new google.maps.Marker({
			position: pos,
			map: map,
			icon: {
				url: "icons/person-outline.png",
				scaledSize: new google.maps.Size(32, 47),
				anchor: new google.maps.Point(16, 40),
			},
		});
	}
}

function startLocationTracking() {
	// make sure geolocation is supported
	if (!navigator.geolocation) {
		return;
	}

	if (positionWatchId) {
		navigator.geolocation.clearWatch(positionWatchId);
	}

	let hasCentered = false;

	positionWatchId = navigator.geolocation.watchPosition(
		(position) => {
			const pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			updateUserMarker(pos);

			if (!hasCentered) {
				map.setCenter(pos);
				map.setZoom(17);
				hasCentered = true;
			}
		},
		(e) => {
			console.log("unable to get geolocation data: ", e);
		}
	);
}

function addMarker(pos, type) {
	const path = iconPaths[type];
	return new google.maps.Marker({
		position: pos,
		map: map,
		icon: {
			url: path,
			scaledSize: new google.maps.Size(32, 32),
			anchor: new google.maps.Point(16, 16),
		},
		animation: google.maps.Animation.DROP,
	});
}

function populateMarkerInfo(data, marker, exists) {
	$("#marker-info-title").text(data.type);
	const coordString = data.pos.lat.toFixed(7) + ", " + data.pos.lng.toFixed(7);
	$("#marker-info-coords").text(coordString);

	$("#marker-info-attributes-wrap").empty();
	for (const attr of data.attributes) {
		let icon = "<i class='fa fa-solid fa-circle-question'></i>";
		let attrClass = "marker-attribute-false";
		if (attr.value) {
			icon = "<i class='fa fa-solid fa-circle-check'></i>";
			attrClass = "marker-attribute-true";
		} else if (attr.value === false) {
			icon = "<i class='fa fa-solid fa-circle-xmark'></i>";
		}

		$("#marker-info-attributes-wrap").append(
			`<div class="marker-info-attribute">
				${icon}
				<p class="${attrClass}">${attr.name}</p>
				<select name="${attr.name}" hidden>
					<option value="unknown">Unknown</option>
					<option value="yes">Yes</option>
					<option value="no">No</option>
				</select>
			</div>`
		);
	}

	const icon = marker.getIcon();
	const scaledIcon = {
		url: icon.url,
		scaledSize: new google.maps.Size(38, 38),
		anchor: new google.maps.Point(19, 19),
	};
	marker.setIcon(scaledIcon);

	$("#hide-info-button").off("click");
	$("#hide-info-button").click((e) => {
		if (!exists) {
			marker.setMap(null);
		} else {
			marker.setIcon(icon);
		}
		$("#hide-info-button").off("click");
		$("#marker-info-wrap").css("left", "-340px");
		$("#create-marker-button").show();
	});

	$("#marker-info-wrap").css("left", 0);
	$("#marker-info-buttons-wrap").show();
	$("#marker-edit-buttons-wrap").hide();
}

function createNewMarker(type, name) {
	const userPos = userMarker ? userMarker.getPosition() : undefined;
	const bounds = map.getBounds();
	let markerPos;
	let marker;

	if (userPos && bounds.contains(userPos)) {
		// user marker is on screen
		markerPos = userPos;
	} else {
		// user marker is off screen
		markerPos = bounds.getCenter();
	}

	marker = addMarker(markerPos, type);
	marker.setDraggable(true);

	const markerInfo = {
		type: name,
		pos: markerPos.toJSON(),
		attributes: [],
	};

	for (const attr of markerAttributes[type]) {
		markerInfo.attributes.push({ name: attr.name, value: undefined, type: attr.type });
	}

	populateMarkerInfo(markerInfo, marker, false);

	$("#create-marker-button").hide();
}

$("#marker-edit-button").click((e) => {
	$("select").show();
	$("#marker-info-buttons-wrap").hide();
	$("#marker-edit-buttons-wrap").show();
});

$("#bike-rack-button").click((e) => {
	createNewMarker("BikeRack", "Bike Rack");
});

$("#restroom-button").click((e) => {
	createNewMarker("Restroom", "Restroom");
});

$("#vending-machine-button").click((e) => {
	createNewMarker("VendingMachine", "Vending Machine");
});

$("#postal-drop-box-button").click((e) => {
	createNewMarker("PostalDropBox", "Postal Drop Box");
});

$("#drinking-fountain-button").click((e) => {
	createNewMarker("DrinkingFountain", "Drinking Fountain");
});

$("#interest-point-button").click((e) => {
	createNewMarker("InterestPoint", "Point of Interest");
});

$("#marker-info-attributes-wrap").on("submit", (e) => {
	e.preventDefault();
});

$("#recenter-button").click(startLocationTracking);

$("#clear-location-search-button").click((e) => {
	$("#location-search").val("");
});

$("#create-marker-button").click((e) => {
	if ($("#create-marker-button").hasClass("square-button")) {
		return;
	}

	$("#create-marker-button").removeClass("round-button");
	$("#create-marker-button").addClass("square-button");

	$("#plus-button").hide();
	$(".marker-type-button").show();
	$(".marker-type-button").css("opacity", 1);
});

$("#create-marker-button").on("focusout", (e) => {
	$("#create-marker-button").removeClass("square-button");
	$("#create-marker-button").addClass("round-button");

	$("#plus-button").show();
	$(".marker-type-button").css("opacity", 0);
	$(".marker-type-button").hide();
});

$(document).ready(() => {
	userId = window.localStorage.getItem("minimap-user-id");

	if (!userId) {
		const charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		userId = "";
		for (let i = 0; i < 20; i++) {
			userId += charSet.charAt(Math.floor(Math.random() * charSet.length));
		}
		window.localStorage.setItem("minimap-user-id", userId);
	}
});
