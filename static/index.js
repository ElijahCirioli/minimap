let map, userMarker, locationSearch;
let positionWatchId;
let userId;
let attributeDictionary;

const markers = [];

const iconPaths = {
	BikeRack: "icons/bike-rack.png",
	Restroom: "icons/restroom.png",
	PostalDropBox: "icons/postal-drop-box.png",
	DrinkingFountain: "icons/drinking-fountain.png",
	VendingMachine: "icons/vending-machine.png",
	InterestPoint: "icons/interest-point.png",
};

function loadDictionary() {
	$.get("/dictionary.json", (data) => {
		attributeDictionary = data;
	});
}

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

	$.get("/markers", (data) => {
		for (const marker of data) {
			addMarker(marker.pos, marker.category, marker.id);
		}
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

	console.log(marker);
	const markerObj = {
		id: id,
		pos: pos,
		marker: marker,
		category: type,
	};

	google.maps.event.addListener(marker, "click", (e) => {
		$.get(`/markerInfo/${markerObj.id}`, (data) => {
			$("#hide-info-button").click();
			populateMarkerInfo(data, markerObj, true);
		});
	});

	markers.push(markerObj);

	return markerObj;
}

function populateMarkerInfo(data, markerObj, exists) {
	$("#marker-info-title").text(data.category);
	const coordString = markerObj.pos.lat.toFixed(7) + ", " + markerObj.pos.lng.toFixed(7);
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

		let input = `<select name="${attr.name}+${attr.columnName}" hidden>
						<option value="unknown" ${attr.value === null ? "selected" : ""}>Unknown</option>
						<option value="yes" ${attr.value ? "selected" : ""}>Yes</option>
						<option value="no" ${attr.value === false ? "selected" : ""}>No</option>
					</select>`;
		if (attr.type === "ShortString") {
			input = `<input name="${attr.name}+${attr.columnName}" class="text-input text-input-short" type="text" maxlength=100 autocomplete="off" spellcheck="false" value="${attr.value}">`;
			attrClass = "marker-attribute-string";
		} else if (attr.type === "LongString") {
			input = `<textarea name="${attr.name}+${attr.columnName}" class="text-input text-input-long" maxlength=256 autocomplete="off" spellcheck="false">${attr.value}</textarea>`;
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

	const icon = markerObj.marker.getIcon();
	const scaledIcon = {
		url: icon.url,
		scaledSize: new google.maps.Size(40, 40),
		anchor: new google.maps.Point(20, 20),
	};
	markerObj.marker.setIcon(scaledIcon);

	$("#hide-info-button").off("click");
	$("#hide-info-button").click((e) => {
		if (!exists) {
			markerObj.marker.setMap(null);
		} else {
			markerObj.marker.setIcon(icon);
		}
		$("#hide-info-button").off("click");
		$("#marker-info-wrap").css("left", "-340px");
		$("#create-marker-button").show();
	});

	$("#marker-edit-confirm-button").off("click");
	$("#marker-edit-confirm-button").click((e) => {
		markerObj.marker.setIcon(icon);
		markerObj.marker.setDraggable(false);
		const attributes = [];
		$("#marker-info-attributes-wrap")
			.children()
			.each(function () {
				const select = $(this).children("select");
				const input = $(this).children("input");
				const textarea = $(this).children("textarea");

				if (select.length > 0) {
					const attrName = select.attr("name").split("+")[0];
					const colName = select.attr("name").split("+")[1];
					const value = select.val() === "yes" ? true : select.val() === "no" ? false : null;
					attributes.push({ name: attrName, value: value, type: "Bool", columnName: colName });
				} else if (input.length > 0) {
					const attrName = input.attr("name").split("+")[0];
					const colName = input.attr("name").split("+")[1];
					attributes.push({
						name: attrName,
						value: input.val(),
						type: "ShortString",
						columnName: colName,
					});
				} else if (textarea.length > 0) {
					const attrName = textarea.attr("name").split("+")[0];
					const colName = textarea.attr("name").split("+")[1];
					attributes.push({
						name: attrName,
						value: textarea.val(),
						type: "LongString",
						columnName: colName,
					});
				}
			});

		if (exists) {
			// update database
		} else {
			// add to database
			const postData = {
				category: markerObj.category,
				pos: markerObj.pos,
				attributes: attributes,
			};
			console.log("posting", postData);

			fetch("/postMarker", {
				method: "POST",
				body: JSON.stringify(postData),
				headers: {
					"Content-Type": "application/json",
				},
			})
				.then((res) => {
					res.json().then((resJSON) => {
						console.log(resJSON);
						markerObj.id = parseInt(resJSON.id);
						data.attributes = attributes;
						populateMarkerInfo(data, markerObj, true);
					});
				})
				.catch((e) => {
					console.log("failed to post", e);
				});
		}
	});

	$("#marker-edit-cancel-button").off("click");
	$("#marker-edit-cancel-button").click((e) => {
		if (exists) {
			markerObj.marker.setIcon(icon);
			populateMarkerInfo(data, markerObj, true);
		} else {
			$("#hide-info-button").click();
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

	if (userPos && bounds.contains(userPos)) {
		// user marker is on screen
		markerPos = userPos.toJSON();
	} else {
		// user marker is off screen
		markerPos = bounds.getCenter().toJSON();
	}

	markerObj = addMarker(markerPos, type, 0);
	console.log(markerObj);
	markerObj.marker.setDraggable(true);
	google.maps.event.addListener(markerObj.marker, "dragend", (e) => {
		const coordString = e.latLng.lat().toFixed(7) + ", " + e.latLng.lng().toFixed(7);
		$("#marker-info-coords").text(coordString);
	});

	const markerInfo = {
		category: name,
		pos: markerPos,
		attributes: JSON.parse(JSON.stringify(attributeDictionary[type])),
	};
	for (const attr of markerInfo.attributes) {
		attr.value = attr.type === "Bool" ? null : "";
	}

	$("#hide-info-button").click();
	populateMarkerInfo(markerInfo, markerObj, false);

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
		if (m.category === itemType) {
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

	loadDictionary();
});

function preloadDatabase() {
	let pos = { lat: 44.565137, lng: -123.2759781 };
	addMarker(pos, "Restroom", 0);
	postDatabase(0, pos, "Restroom", [
		{ name: "Single user", type: "Bool", value: null },
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
		{ name: "Accepts cash", type: "Bool", value: null },
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
