let map, userMarker, locationSearch; // google maps API variables
let positionWatchId;

const markers = [];

const iconPaths = {
	BikeRack: "icons/bike-rack.png",
	Restroom: "icons/restroom.png",
	PostalDropBox: "icons/postal-drop-box.png",
	DrinkingFountain: "icons/drinking-fountain.png",
	VendingMachine: "icons/vending-machine.png",
	InterestPoint: "icons/interest-point.png",
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

	// get all the markers from the server
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
		// move existing marker
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

	// see if we're tracking already
	if (positionWatchId) {
		// stop tracking
		navigator.geolocation.clearWatch(positionWatchId);
	}

	let hasCentered = false;

	positionWatchId = navigator.geolocation.watchPosition(
		(position) => {
			const pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			// move the user marker
			updateUserMarker(pos);

			// center view on user if they just clicked the button
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

	// create the google maps marker
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

	// create the marker object
	const markerObj = {
		id: id,
		marker: marker,
		category: type,
	};

	// add the click event
	google.maps.event.addListener(marker, "click", (e) => {
		if (markerObj.id === -1) {
			return;
		}
		$.get(`/markerInfo/${markerObj.id}`, (data) => {
			$("#hide-info-button").click();
			displayMarkerInfo(data, markerObj, true);
		});
	});

	markers.push(markerObj);
	return markerObj;
}
