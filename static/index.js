let map, userMarker, locationSearch;
let positionWatchId;

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

	map.addListener("click", (e) => {
		const pos = e.latLng.toJSON();

		const rand = Math.random();
		if (rand > 0.8) {
			new Restroom(pos, map);
		} else if (rand > 0.6) {
			new BikeRack(pos, map);
		} else if (rand > 0.4) {
			new PostalDropBox(pos, map);
		} else if (rand > 0.2) {
			new DrinkingFountain(pos, map);
		} else {
			new VendingMachine(pos, map);
		}
	});

	// setup location search API
	setupLocationSearch();

	// try to get the current user position
	centerOnUserLocation();
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

	positionWatchId = navigator.geolocation.watchPosition(
		(position) => {
			const pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			updateUserMarker(pos);
		},
		(e) => {
			console.log("unable to get geolocation data: ", e);
		}
	);
}

function centerOnUserLocation() {
	// make sure geolocation is supported
	if (!navigator.geolocation) {
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(position) => {
			const pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			// recenter map
			map.setCenter(pos);
			map.setZoom(17);

			// update marker
			updateUserMarker(pos);

			if (!positionWatchId) {
				startLocationTracking();
			}
		},
		(e) => {
			console.log("unable to get geolocation data: ", e);
		}
	);
}

$("#recenter-button").click(centerOnUserLocation);

$("#clear-location-search-button").click((e) => {
	$("#location-search").val("");
});
