function updateMarkerInDatabase(markerData, markerObj) {
	const postData = {
		id: markerObj.id,
		category: markerObj.category,
		attributes: markerData.attributes,
	};

	fetch("/editMarker", {
		method: "POST",
		body: JSON.stringify(postData),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then((res) => {
			if (res.status === 200) {
				displayMarkerInfo(markerData, markerObj, true);
			} else {
				console.log("failed to edit marker", res);
			}
		})
		.catch((e) => {
			console.log("failed to edit marker", e);
		});
}

function postMarkerToDatabase(markerData, markerObj) {
	const pos = markerObj.marker.getPosition();
	const postData = {
		category: markerObj.category,
		pos: { lat: pos.lat(), lng: pos.lng() },
		attributes: markerData.attributes,
	};

	fetch("/postMarker", {
		method: "POST",
		body: JSON.stringify(postData),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then(async (res) => {
			if (res.status === 200) {
				resJSON = await res.json();
				markerObj.id = parseInt(resJSON.id);
				displayMarkerInfo(markerData, markerObj, true);
			} else {
				console.log("failed to post", res);
			}
		})
		.catch((e) => {
			console.log("failed to post", e);
		});
}

function reportMarker(markerObj) {
	const report = {
		markerID: markerObj.id,
		userID: userId,
	};

	fetch("/reportMarker", {
		method: "POST",
		body: JSON.stringify(report),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then((res) => {
			if (res.status === 200) {
				$("#modal-wrap").hide();
				$("#hide-info-button").click();
				markerObj.marker.setMap(null);
				markers = markers.filter((m) => {
					return m !== markerObj;
				});
			} else {
				console.log("failed to report marker", res);
				$("#modal-wrap").hide();
				popupMessage(
					"You've already reported this marker.",
					`<i class="fa fa-solid fa-triangle-exclamation" style="color: var(--red);"></i>`
				);
			}
		})
		.catch((e) => {
			console.log("failed to report marker", e);
		});
}

function postReviewToDatabase(markerData, markerObj, review) {
	fetch("/postReview", {
		method: "POST",
		body: JSON.stringify(review),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then((res) => {
			if (res.status === 200) {
				markerData.reviews.push(review);
				displayMarkerReviews(markerData, markerObj);
			} else {
				console.log("failed to post review", res);
				return;
			}
		})
		.catch((e) => {
			console.log("failed to post review", e);
		});
}

function reportReview(markerObj, review) {
	const report = {
		markerID: markerObj.id,
		userID: review.userID,
	};

	fetch("/reportReview", {
		method: "POST",
		body: JSON.stringify(report),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then((res) => {
			if (res.status === 200) {
				$.get(`/markerInfo/${markerObj.id}`, (data) => {
					$("#modal-wrap").hide();
					$("#hide-info-button").click();
					displayMarkerInfo(data, markerObj, true);
				});
			} else {
				console.log("failed to report review", res);
				return;
			}
		})
		.catch((e) => {
			console.log("failed to report review", e);
		});
}
