let userId; // tracks this user's identity
let attributeDictionary; // defines entity attributes

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
	const coordString = markerObj.pos.lat.toFixed(7) + ", " + markerObj.pos.lng.toFixed(7);
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
}

function displayMarkerReviews(markerData, markerObj) {
	// display relevant entities
	$("#marker-reviews-wrap").show();
	$("#review-creation-wrap").hide();
	$("#review-creation-button").show();
	$("#reviews-scroll-wrap").show();
	$("#average-review-rating").show();
	if (markerData.reviews.length === 0) {
		$("#average-review-rating").hide();
	}

	let totalRating = 0;
	$("#reviews-scroll-wrap").empty();

	// look at each review
	for (const review of markerData.reviews) {
		totalRating += review.rating;

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

		$("#reviews-scroll-wrap").append(revElement);
	}

	let halfStars = Math.round((2 * totalRating) / markerData.reviews.length);
	$("#average-review-rating")
		.children(".star")
		.each(function () {
			if (halfStars >= 2) {
				$(this).attr("src", "icons/full-star.png");
			} else if (halfStars > 1) {
				$(this).attr("src", "icons/half-star.png");
			} else {
				$(this).attr("src", "icons/empty-star.png");
			}
			halfStars -= 2;
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

	console.log(pos);
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

	const markerInfo = {
		category: name,
		pos: markerPos,
		attributes: JSON.parse(JSON.stringify(attributeDictionary[type])),
	};
	for (const attr of markerInfo.attributes) {
		attr.value = attr.type === "Bool" ? null : "";
	}

	$("#hide-info-button").click();
	displayMarkerInfo(markerInfo, markerObj, false);

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
	if (!userId) {
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
