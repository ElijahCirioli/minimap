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
	const postData = {
		category: markerObj.category,
		pos: markerObj.pos,
		attributes: markerData.attributes,
	};

	fetch("/postMarker", {
		method: "POST",
		body: JSON.stringify(postData),
		headers: {
			"Content-Type": "application/json",
		},
	})
		.then((res) => {
			if (res.status !== 200) {
				console.log("failed to post", res);
				return;
			}
			res.json().then((resJSON) => {
				markerObj.id = parseInt(resJSON.id);
				displayMarkerInfo(markerData, markerObj, true);
			});
		})
		.catch((e) => {
			console.log("failed to post", e);
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
