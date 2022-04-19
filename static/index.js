let map, userMarker;

function createMap() {
	// create google maps object
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: 44.565288, lng: -123.278921 },
		zoom: 17,
		zoomControl: true,
		mapTypeControl: false,
		scaleControl: true,
		streetViewControl: false,
		rotateControl: true,
		fullscreenControl: false,
	});

	// try to get the current user position
	getUserPosition();
}

function getUserPosition() {
	// make sure geolocation is supported
	if (!navigator.geolocation) {
		return;
	}

	navigator.geolocation.getCurrentPosition(
		(position) => {
			const posObject = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
			};

			// recenter map
			map.setCenter(posObject);
			map.setZoom(17);

			// update marker
			if (!userMarker) {
				// create marker
				userMarker = new google.maps.Marker({
					position: posObject,
					map: map,
					icon: {
						url: "icons/person-outline.png",
						scaledSize: new google.maps.Size(32, 47),
						anchor: new google.maps.Point(16, 40),
					},
				});
			} else {
				userMarker.setPosition(posObject);
			}
		},
		(e) => {
			console.log("unable to get geolocation data: ", e);
		}
	);
}

$("#recenter-button").click(getUserPosition);
