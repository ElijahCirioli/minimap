let map, userMarker, locationSearch;
let positionWatchId;
let userId;
let markers = [];

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
	map = new google.maps.Map($("#map")[0], {
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
		clickableIcons: false,
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
		types: ["establishment", "geocode"],
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

function addMarker(pos, type, id) {
	const path = iconPaths[type];
	const marker = new google.maps.Marker({
		position: pos,
		map: map,
		icon: {
			url: path,
			scaledSize: new google.maps.Size(32, 32),
			anchor: new google.maps.Point(16, 16),
		},
		animation: google.maps.Animation.DROP,
	});

	google.maps.event.addListener(marker, "click", (e) => {
		if (getDatabase(id)) {
			$("#hide-info-button").click();
			populateMarkerInfo(id, marker, true);
		}
	});
	markers.push({
		id: id,
		marker: marker,
		type: type,
	});

	return marker;
}

function populateMarkerInfo(id, marker, exists, presetData) {
	const data = presetData || getDatabase(id);

	$("#marker-info-title").text(data.type);
	const coordString = data.pos.lat.toFixed(7) + ", " + data.pos.lng.toFixed(7);
	$("#marker-info-coords").text(coordString);

	$("#marker-info-attributes-wrap").empty();
	for (const attr of data.attributes) {
		let icon = "";
		let attrClass;
		if (attr.type === "Bool") {
			icon = "<i class='fa fa-solid fa-circle-question'></i>";
			attrClass = "marker-attribute-false";
			if (attr.value) {
				icon = "<i class='fa fa-solid fa-circle-check'></i>";
				attrClass = "marker-attribute-true";
			} else if (attr.value === false) {
				icon = "<i class='fa fa-solid fa-circle-xmark'></i>";
			}
		}

		let input = `<select name="${attr.name}" hidden>
						<option value="unknown" ${attr.value === undefined ? "selected" : ""}>Unknown</option>
						<option value="yes" ${attr.value ? "selected" : ""}>Yes</option>
						<option value="no" ${attr.value === false ? "selected" : ""}>No</option>
					</select>`;
		if (attr.type === "ShortString") {
			input = `<input name="${attr.name}" class="text-input text-input-short" type="text" maxlength=100 autocomplete="off" spellcheck="false" value="${attr.value}">`;
			attrClass = "marker-attribute-string";
		} else if (attr.type === "LongString") {
			input = `<textarea name="${attr.name}" class="text-input text-input-long" maxlength=256 autocomplete="off" spellcheck="false">${attr.value}</textarea>`;
			attrClass = "marker-attribute-string";
		}

		$("#marker-info-attributes-wrap").append(
			`<div class="marker-info-attribute">
				${icon}
				<p class="${attrClass}">${attr.name}${attr.type === "Bool" ? "" : ":"}</p>
				${input}
			</div>`
		);

		$(".text-input-long").on("keyup change input", resizeTextInputs);
	}

	resizeTextInputs();

	$("select").on("change", (e) => {
		const val = e.target.value;
		let newClass = "marker-attribute-false";
		let newIcon = "<i class='fa fa-solid fa-circle-question'></i>";
		if (val === "yes") {
			newClass = "marker-attribute-true";
			newIcon = "<i class='fa fa-solid fa-circle-check'></i>";
		} else if (val === "no") {
			newIcon = "<i class='fa fa-solid fa-circle-xmark'></i>";
		}

		const row = $(e.target).parent();
		row.children("i").remove();
		row.prepend(newIcon);
		row.children("p").removeClass("marker-attribute-false");
		row.children("p").removeClass("marker-attribute-true");
		row.children("p").addClass(newClass);
	});

	const icon = marker.getIcon();
	const scaledIcon = {
		url: icon.url,
		scaledSize: new google.maps.Size(40, 40),
		anchor: new google.maps.Point(20, 20),
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

	$("#marker-edit-confirm-button").off("click");
	$("#marker-edit-confirm-button").click((e) => {
		marker.setIcon(icon);
		marker.setDraggable(false);
		const attributes = [];
		$("#marker-info-attributes-wrap")
			.children()
			.each(function (i) {
				const select = $(this).children("select");
				const input = $(this).children("input");
				const textarea = $(this).children("textarea");
				if (select.length > 0) {
					const value = select.val() === "yes" ? true : select.val() === "no" ? false : undefined;
					attributes.push({ name: select.attr("name"), value: value, type: "Bool" });
				} else if (input.length > 0) {
					attributes.push({ name: input.attr("name"), value: input.val(), type: "ShortString" });
				} else if (textarea.length > 0) {
					attributes.push({
						name: textarea.attr("name"),
						value: textarea.val(),
						type: "LongString",
					});
				}
			});

		if (exists) {
			// update database
			updateDatabase(id, attributes);
		} else {
			// add to database
			postDatabase(id, marker.getPosition().toJSON(), data.type, attributes);
		}

		populateMarkerInfo(id, marker, true);
	});

	$("#marker-edit-cancel-button").off("click");
	$("#marker-edit-cancel-button").click((e) => {
		if (!exists) {
			$("#hide-info-button").click();
		} else {
			marker.setIcon(icon);
			populateMarkerInfo(id, marker, exists);
		}
	});

	$("#marker-info-wrap").css("left", 0);
	$("#marker-info-buttons-wrap").show();
	$("#marker-edit-buttons-wrap").hide();

	if (!exists) {
		$("#marker-edit-button").click();
	}
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

	marker = addMarker(markerPos, type, markers.length);
	marker.setDraggable(true);
	google.maps.event.addListener(marker, "dragend", (e) => {
		const coordString = e.latLng.lat().toFixed(7) + ", " + e.latLng.lng().toFixed(7);
		$("#marker-info-coords").text(coordString);
	});

	const markerInfo = {
		type: name,
		pos: markerPos.toJSON(),
		attributes: [],
	};
	for (const attr of markerAttributes[type]) {
		const presetVal = attr.type === "Bool" ? undefined : "";
		markerInfo.attributes.push({ name: attr.name, value: presetVal, type: attr.type });
	}

	$("#hide-info-button").click();
	populateMarkerInfo(markers.length - 1, marker, false, markerInfo);

	// hide create menu
	setTimeout(() => {
		$(":focus").blur();
	}, 50);
}

function resizeTextInputs() {
	if ($(".text-input-long").length === 0) {
		return;
	}
	$(".text-input-long").css("height", "auto");
	const height = $(".text-input-long")[0].scrollHeight;
	const newHeight = Math.ceil(height / 21) * 21;
	$(".text-input-long").css("height", newHeight + "px");
}

$("#marker-edit-button").click((e) => {
	$("select").show();
	$(".text-input").addClass("text-input-editable");
	$("#marker-info-buttons-wrap").hide();
	$("#marker-edit-buttons-wrap").show();
});

$("#bike-rack-button").click((e) => {
	if (!$("#filter-item-BikeRack").hasClass("active-item")) {
		$("#filter-item-BikeRack").click();
	}
	createNewMarker("BikeRack", "Bike Rack");
});

$("#restroom-button").click((e) => {
	if (!$("#filter-item-Restroom").hasClass("active-item")) {
		$("#filter-item-Restroom").click();
	}
	createNewMarker("Restroom", "Restroom");
});

$("#vending-machine-button").click((e) => {
	if (!$("#filter-item-VendingMachine").hasClass("active-item")) {
		$("#filter-item-VendingMachine").click();
	}
	createNewMarker("VendingMachine", "Vending Machine");
});

$("#postal-drop-box-button").click((e) => {
	if (!$("#filter-item-PostalDropBox").hasClass("active-item")) {
		$("#filter-item-PostalDropBox").click();
	}
	createNewMarker("PostalDropBox", "Postal Drop Box");
});

$("#drinking-fountain-button").click((e) => {
	if (!$("#filter-item-DrinkingFountain").hasClass("active-item")) {
		$("#filter-item-DrinkingFountain").click();
	}
	createNewMarker("DrinkingFountain", "Drinking Fountain");
});

$("#interest-point-button").click((e) => {
	if (!$("#filter-item-InterestPoint").hasClass("active-item")) {
		$("#filter-item-InterestPoint").click();
	}
	createNewMarker("InterestPoint", "Point of Interest");
});

$("#marker-info-attributes-wrap").on("submit", (e) => {
	e.preventDefault();
});

$("#marker-share-button").click((e) => {
	alert("This functionality will let you share a link directly to a marker.");
});

$("#marker-report-button").click((e) => {
	alert(
		"This functionality will let you report a marker as being inappropriate or inaccurate. This will lead to markers being removed from the database."
	);
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

$("#filter-title").click((e) => {
	$("#filter-title").hide();
	$("#filter-items").show();
});

$("#filter-wrap").on("focusout", (e) => {
	$("#filter-items").hide();
	$("#filter-title").show();
});

$(".filter-item").click((e) => {
	const item = $(e.target);
	const itemType = item.attr("id").split("-")[2];
	let newMap = null;
	if (item.hasClass("active-item")) {
		item.removeClass("active-item");
	} else {
		item.addClass("active-item");
		newMap = map;
	}

	for (const m of markers) {
		if (m.type === itemType) {
			m.marker.setMap(newMap);
		}
	}
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

	preloadDatabase();
});

let database = {};
function postDatabase(id, pos, type, attributes) {
	database[id] = {
		type: type,
		pos: pos,
		attributes: attributes,
	};
}

function getDatabase(id) {
	return database[id];
}

function updateDatabase(id, attributes) {
	database[id].attributes = attributes;
}

function preloadDatabase() {
	let pos = { lat: 44.565137, lng: -123.2759781 };
	addMarker(pos, "Restroom", 0);
	postDatabase(0, pos, "Restroom", [
		{ name: "Single user", type: "Bool", value: undefined },
		{ name: "Gender inclusive", type: "Bool", value: true },
		{ name: "Baby-changing station", type: "Bool", value: true },
		{ name: "Sanitary products", type: "Bool", value: false },
		{ name: "Free to use", type: "Bool", value: true },
	]);

	pos = { lat: 44.5660311, lng: -123.2817719 };
	addMarker(pos, "VendingMachine", 1);
	postDatabase(1, pos, "Vending Machine", [
		{ name: "Drinks", type: "Bool", value: true },
		{ name: "Candy", type: "Bool", value: true },
		{ name: "Food", type: "Bool", value: false },
		{ name: "Accepts card", type: "Bool", value: true },
		{ name: "Accepts cash", type: "Bool", value: undefined },
	]);

	pos = { lat: 44.5658824, lng: -123.281383 };
	addMarker(pos, "Restroom", 2);
	postDatabase(2, pos, "Restroom", [
		{ name: "Single user", type: "Bool", value: true },
		{ name: "Gender inclusive", type: "Bool", value: true },
		{ name: "Baby-changing station", type: "Bool", value: false },
		{ name: "Sanitary products", type: "Bool", value: true },
		{ name: "Free to use", type: "Bool", value: true },
	]);

	pos = { lat: 44.5645906, lng: -123.2758667 };
	addMarker(pos, "PostalDropBox", 3);
	postDatabase(3, pos, "Postal Drop Box", [
		{ name: "Collection time", type: "ShortString", value: "8:00am" },
	]);

	pos = { lat: 44.5650628, lng: -123.2762856 };
	addMarker(pos, "DrinkingFountain", 4);
	postDatabase(4, pos, "Drinking Fountain", [{ name: "Water bottle filler", type: "Bool", value: true }]);

	pos = { lat: 44.5652986, lng: -123.2796735 };
	addMarker(pos, "BikeRack", 5);
	postDatabase(5, pos, "Bike Rack", [{ name: "Covered", type: "Bool", value: true }]);

	pos = { lat: 44.5649979, lng: -123.2784499 };
	addMarker(pos, "DrinkingFountain", 6);
	postDatabase(6, pos, "Drinking Fountain", [{ name: "Water bottle filler", type: "Bool", value: false }]);

	pos = { lat: 44.5667853, lng: -123.2757095 };
	addMarker(pos, "PostalDropBox", 7);
	postDatabase(7, pos, "Postal Drop Box", [
		{ name: "Collection time", type: "ShortString", value: "12:30pm" },
	]);

	pos = { lat: 44.5661209, lng: -123.2750457 };
	addMarker(pos, "BikeRack", 8);
	postDatabase(8, pos, "Bike Rack", [{ name: "Covered", type: "Bool", value: false }]);

	pos = { lat: 44.5651578, lng: -123.2776743 };
	addMarker(pos, "InterestPoint", 9);
	postDatabase(9, pos, "Point of Interest", [
		{ name: "Name", type: "ShortString", value: "Statue" },
		{
			name: "Description",
			type: "LongString",
			value: "It's a statue, ya know? I don't really know much about it. I think it's a woman holding a diploma. That'll be me one day.",
		},
	]);

	pos = { lat: 44.5640302, lng: -123.2806315 };
	addMarker(pos, "InterestPoint", 10);
	postDatabase(10, pos, "Point of Interest", [
		{ name: "Name", type: "ShortString", value: "Stairs" },
		{
			name: "Description",
			type: "LongString",
			value: "Is this interesting? I don't think so.",
		},
	]);
}
