let userId; // tracks this user's identity
let attributeDictionary; // defines entity attributes
let popupTimeout;

function loadDictionary() {
	$.get("/dictionary.json", (data) => {
		attributeDictionary = data;
	});
}

function displayMarkerInfo(markerData, markerObj, existsInDb) {
	// create a scaled version of the marker
	const markerIcon = markerObj.marker.getIcon();
	const scaledMarkerIcon = {
		url: markerIcon.url,
		scaledSize: new google.maps.Size(40, 40),
		anchor: new google.maps.Point(20, 20),
	};
	markerObj.marker.setIcon(scaledMarkerIcon);

	// update the title
	$("#marker-info-title").text(markerData.category);

	// display the coordinates
	const pos = markerObj.marker.getPosition();
	const coordString = pos.lat().toFixed(7) + ", " + pos.lng().toFixed(7);
	$("#marker-info-coords").text(coordString);

	// fill the attributes
	$("#marker-info-attributes-wrap").empty();
	for (const attr of markerData.attributes) {
		let attrIcon = "";
		let attrClass;
		if (attr.type === "Bool") {
			attrIcon = "<i class='fa fa-solid fa-circle-question'></i>";
			attrClass = "marker-attribute-false";
			if (attr.value) {
				attrIcon = "<i class='fa fa-solid fa-circle-check'></i>";
				attrClass = "marker-attribute-true";
			} else if (attr.value === false) {
				attrIcon = "<i class='fa fa-solid fa-circle-xmark'></i>";
			}
		}

		let input = `<select name="${attr.name}+${attr.columnName}" hidden>
						<option value="unknown" ${attr.value === null ? "selected" : ""}>Unknown</option>
						<option value="yes" ${attr.value ? "selected" : ""}>Yes</option>
						<option value="no" ${attr.value === false ? "selected" : ""}>No</option>
					</select>`;
		if (attr.type === "ShortString") {
			input = `<input name="${attr.name}+${attr.columnName}" class="text-input text-input-short" type="text" maxlength="50" autocomplete="off" spellcheck="false" value="${attr.value}">`;
			attrClass = "marker-attribute-string";
		} else if (attr.type === "LongString") {
			input = `<textarea name="${attr.name}+${attr.columnName}" class="text-input text-input-long" maxlength="256" autocomplete="off" spellcheck="false">${attr.value}</textarea>`;
			attrClass = "marker-attribute-string";
		}

		$("#marker-info-attributes-wrap").append(
			`<div class="marker-info-attribute">
				${attrIcon}
				<p class="${attrClass}">${attr.name}${attr.type === "Bool" ? "" : ":"}</p>
				${input}
			</div>`
		);
	}

	resizeTextInputs();
	setupMarkerInfoListeners(markerData, markerObj, existsInDb, markerIcon);

	$("#marker-info-wrap").css("left", 0);
	$("#marker-info-buttons-wrap").show();
	$("#marker-edit-buttons-wrap").hide();

	if (existsInDb) {
		displayMarkerReviews(markerData, markerObj);
	} else {
		$("#marker-reviews-wrap").hide();
		// go into edit mode if this marker was just created
		$("#marker-edit-button").click();
	}
}

function setupMarkerInfoListeners(markerData, markerObj, existsInDb, originalIcon) {
	$("select").on("change", (e) => {
		const val = e.target.value;
		let newAttrClass = "marker-attribute-false";
		let newAttrIcon = "<i class='fa fa-solid fa-circle-question'></i>";
		if (val === "yes") {
			newAttrClass = "marker-attribute-true";
			newAttrIcon = "<i class='fa fa-solid fa-circle-check'></i>";
		} else if (val === "no") {
			newAttrIcon = "<i class='fa fa-solid fa-circle-xmark'></i>";
		}

		const row = $(e.target).parent();
		row.children("i").remove();
		row.prepend(newAttrIcon);
		row.children("p").removeClass("marker-attribute-false");
		row.children("p").removeClass("marker-attribute-true");
		row.children("p").addClass(newAttrClass);
	});

	$(".text-input-long").on("keyup change input", resizeTextInputs);

	$("#hide-info-button").off("click");
	$("#hide-info-button").click((e) => {
		if (!existsInDb) {
			markerObj.marker.setMap(null);
		} else {
			markerObj.marker.setIcon(originalIcon);
		}
		$("#hide-info-button").off("click");
		$("#marker-info-wrap").css("left", "-340px");
		$("#create-marker-button").show();
	});

	$("#marker-edit-confirm-button").off("click");
	$("#marker-edit-confirm-button").click((e) => {
		markerObj.marker.setIcon(originalIcon);
		markerObj.marker.setDraggable(false);
		markerData.attributes = collectMarkerAttributes();

		if (existsInDb) {
			updateMarkerInDatabase(markerData, markerObj);
		} else {
			postMarkerToDatabase(markerData, markerObj);
		}
	});

	$("#marker-edit-cancel-button").off("click");
	$("#marker-edit-cancel-button").click((e) => {
		if (existsInDb) {
			markerObj.marker.setIcon(originalIcon);
			displayMarkerInfo(markerData, markerObj, true);
		} else {
			$("#hide-info-button").click();
		}
	});

	$("#submit-marker-report-button").off("click");
	$("#submit-marker-report-button").click((e) => {
		reportMarker(markerObj);
	});
}

function displayMarkerReviews(markerData, markerObj) {
	// display relevant entities
	$("#marker-reviews-wrap").show();
	$("#review-creation-wrap").hide();
	$("#review-creation-button").show();
	$("#reviews-scroll-wrap").show();
	$("#average-review-rating").show();

	const numReviews = markerData.reviews.length;
	$("#review-num-users").text(`from ${numReviews} user${numReviews > 1 ? "s" : ""}`);
	if (numReviews === 0) {
		$("#average-review-rating").hide();
		$("#review-num-users").text("");
	}

	let totalRating = 0;
	$("#reviews-scroll-wrap").empty();

	// look at each review
	for (const review of markerData.reviews.reverse()) {
		totalRating += review.rating;

		// don't give me the option to post another review if I've already posted one
		if (parseInt(review.userID) === userId) {
			$("#review-creation-button").hide();
		}

		// don't display if there's no description
		if (review.description === null) {
			continue;
		}

		// create the element
		const revElement = $(`
		<div class="review-wrap">
			<div class="review-header">
				<p></p>
				<div class="review-rating">
					<img class="star" src="icons/empty-star.png">
					<img class="star" src="icons/empty-star.png">
					<img class="star" src="icons/empty-star.png">
					<img class="star" src="icons/empty-star.png">
					<img class="star" src="icons/empty-star.png">
				</div>
			</div>
			<p class="review-body"></p>
			<button class="review-report-button">Report</button>
		</div>`);

		const name = review.username || "Anonymous";
		revElement.children(".review-header").children("p").text(name);
		revElement.children(".review-body").text(review.description);

		// change the star icons
		revElement
			.children(".review-header")
			.children(".review-rating")
			.children(".star")
			.each(function (i) {
				if (i < review.rating) {
					$(this).attr("src", "icons/full-star.png");
				}
			});

		// setup report functionality
		revElement.children(".review-report-button").click((e) => {
			$("#review-report-modal").show();
			$("#marker-report-modal").hide();
			$("#modal-wrap").show();
			$(".report-checkbox").prop("checked", false);
			$(".report-text-box").val("");

			$("#submit-review-report-button").off("click");
			$("#submit-review-report-button").click((e) => {
				reportReview(markerObj, review);
			});
		});

		$("#reviews-scroll-wrap").append(revElement);
	}

	let halfStars = Math.round((2 * totalRating) / numReviews);
	$("#average-review-rating")
		.children(".star")
		.each(function () {
			if (halfStars >= 2) {
				$(this).attr("src", "icons/full-star.png");
			} else if (halfStars >= 1) {
				$(this).attr("src", "icons/half-star.png");
			} else {
				$(this).attr("src", "icons/empty-star.png");
			}
			halfStars -= 2;
		});

	setupReviewButtons(markerData, markerObj);
}

function setupReviewButtons(markerData, markerObj) {
	$("#review-cancel-post-button").off("click");
	$("#review-cancel-post-button").on("click", (e) => {
		displayMarkerReviews(markerData, markerObj);
	});

	$("#review-confirm-post-button").off("click");
	$("#review-confirm-post-button").on("click", (e) => {
		let rating = 0;
		$("#input-review-rating")
			.children(".star")
			.each(function () {
				if ($(this).attr("src").includes("full")) {
					rating++;
				}
			});

		if (rating === 0) {
			popupMessage(
				"You must specify a star rating in order to post a review.",
				`<i class="fa fa-solid fa-triangle-exclamation" style="color: var(--red);"></i>`
			);
			return;
		}

		const reviewText = $("#review-body-input").val().trim();
		const review = {
			username: $("#review-name-input").val().trim(),
			description: reviewText === "" ? null : reviewText,
			markerID: markerObj.id,
			userID: userId,
			rating: rating,
		};

		postReviewToDatabase(markerData, markerObj, review);
	});
}

function collectMarkerAttributes() {
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

	return attributes;
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

	markerObj = addMarker(markerPos, type, -1);
	markerObj.marker.setDraggable(true);
	google.maps.event.addListener(markerObj.marker, "dragend", (e) => {
		const coordString = e.latLng.lat().toFixed(7) + ", " + e.latLng.lng().toFixed(7);
		$("#marker-info-coords").text(coordString);
	});

	const markerData = {
		category: name,
		attributes: JSON.parse(JSON.stringify(attributeDictionary[type])),
		reviews: [],
	};
	for (const attr of markerData.attributes) {
		attr.value = attr.type === "Bool" ? null : "";
	}

	$("#hide-info-button").click();
	displayMarkerInfo(markerData, markerObj, false);

	// hide create menu
	setTimeout(() => {
		$(":focus").blur();
	}, 50);
}

function resizeTextInputs() {
	$(".text-input-long").css("height", "auto");
	$(".text-input-long").each(function () {
		const height = $(this)[0].scrollHeight;
		const newHeight = Math.ceil(height / 21) * 21;
		$(this).css("height", newHeight + "px");
	});
}

function popupMessage(message, icon) {
	if (popupTimeout) {
		clearTimeout(popupTimeout);
		popupTimeout = undefined;
	}

	$("#popup-text").text(message);
	$("#popup-wrap").children("i").remove();
	$("#popup-wrap").prepend($(icon));
	$("#popup-wrap").css("top", "0");

	popupTimeout = setTimeout(() => {
		popupTimeout = undefined;
		$("#popup-wrap").css("top", "-120px");
	}, 5000);
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

$("#review-creation-wrap").on("submit", (e) => {
	e.preventDefault();
});

$(".report-reasons").on("submit", (e) => {
	e.preventDefault();
});

$("#marker-share-button").click((e) => {
	alert("This functionality will let you share a link directly to a marker.");
});

$("#marker-report-button").click((e) => {
	$("#marker-report-modal").show();
	$("#review-report-modal").hide();
	$("#modal-wrap").show();
	$(".report-checkbox").prop("checked", false);
	$(".report-text-box").val("");
});

$(".modal-cancel-button").click((e) => {
	$("#modal-wrap").hide();
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

$("#review-creation-button").click((e) => {
	// show appropriate elements
	$("#review-creation-wrap").show();
	$("#review-creation-button").hide();
	$("#reviews-scroll-wrap").hide();

	$("#review-body-input").val("");
	$("#input-review-rating").children(".star").attr("src", "icons/empty-star.png");

	$.get(`/username/${userId}`).then((res) => {
		$("#review-name-input").val(res.username || "");
	});
});

$("#input-review-rating")
	.children(".star")
	.click(function (e) {
		$("#input-review-rating").children(".star").attr("src", "icons/empty-star.png");
		$(this).prevAll(".star").attr("src", "icons/full-star.png");
		$(this).attr("src", "icons/full-star.png");
	});

$("#popup-button").click((e) => {
	if (popupTimeout) {
		clearTimeout(popupTimeout);
		popupTimeout = undefined;
	}
	$("#popup-wrap").css("top", "-120px");
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

	// see which way it was just toggled
	let newMap = null;
	if (item.hasClass("active-item")) {
		item.removeClass("active-item");
	} else {
		item.addClass("active-item");
		newMap = map;
	}

	// update relevant markers
	for (const m of markers) {
		if (m.category === itemType) {
			m.marker.setMap(newMap);
		}
	}
});

$(document).ready(() => {
	// load or generate a user ID
	userId = window.localStorage.getItem("minimap-user-id-int");
	if (userId) {
		userId = parseInt(userId);
	} else {
		$.get("/generateUser")
			.then((res) => {
				userId = parseInt(res.userID);
				window.localStorage.setItem("minimap-user-id-int", userId);
			})
			.catch((e) => {
				console.log("failed to generate user", e);
			});
	}

	// fetch the data dictionary from the server
	loadDictionary();
});
