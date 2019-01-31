function autocomplete(input, latInput, lngInput) {
	if(!input) return; // skip the function from running

	const dropdown = new google.maps.places.Autocomplete(input);

	dropdown.addListener('place_changed', () => {
		const place = dropdown.getPlace();
		latInput.value = place.geometry.location.lat();
		lngInput.value = place.geometry.location.lng();
	});

	// prevent the form from submitting whenever we hit enter on the address field
	input.on('keydown', (e) => {
		if(e.keyCode === 13){ // remeber that keyCode 13 is the [enter] key
			e.preventDefault()
		}
	});
}

export default autocomplete;