document.addEventListener('DOMContentLoaded', () => {
    // Regular expressions for validation
    const regexPatterns = {
        fullName: /^[A-Za-z]{1,}[A-Za-z\s]{0,}$/,
        mobileNo: /^(?!([0-9])\1{9})[6-9][0-9]{9}$/,
        address: /^[A-Za-z0-9\s,.-]{5,}$/,
        landmark: /^[A-Za-z0-9\s,.-]{3,}$/,
        pincode: /^[0-9]{6}$/,
        flatNo: /^[A-Za-z0-9\s-]{1,}$/,
        district: /^[A-Za-z\s]{2,}$/,
        state: /^[A-Za-z\s]{2,}$/,
        country: /^[A-Za-z\s]{2,}$/,
        city: /^[A-Za-z\s]{2,}$/
    };

    // Function to validate a field
    function validateField(id, pattern, errorId) {
        const field = document.getElementById(id);
        if (!field) {
            console.warn(`Field with ID "${id}" not found.`);
            return true;  // Skip validation if field is not found
        }

        const error = document.getElementById(errorId);
        if (field.value.trim() === '' && !field.required) {
            error.textContent = '';
            return true;
        }

        if (!pattern || !pattern.test(field.value.trim())) {
            error.textContent = `Invalid ${id}.`;
            return false;
        }

        error.textContent = '';
        return true;
    }

    // Validate all fields on input
    function setupValidation() {
        const fields = [
            { id: 'fullName', pattern: regexPatterns.fullName, errorId: 'fullNameError' },
            { id: 'mobileNo', pattern: regexPatterns.mobileNo, errorId: 'mobileNoError' },
            { id: 'address', pattern: regexPatterns.address, errorId: 'addressError' },
            { id: 'landmark', pattern: regexPatterns.landmark, errorId: 'landmarkError' },
            { id: 'pincode', pattern: regexPatterns.pincode, errorId: 'pincodeError' },
            { id: 'flatNo', pattern: regexPatterns.flatNo, errorId: 'flatNoError' },
            { id: 'district', pattern: regexPatterns.district, errorId: 'districtError' },
            { id: 'state', pattern: regexPatterns.state, errorId: 'stateError' },
            { id: 'country', pattern: regexPatterns.country, errorId: 'countryError' },
            { id: 'city', pattern: regexPatterns.city, errorId: 'cityError' },
        ];

        fields.forEach(field => {
            const inputElement = document.getElementById(field.id);
            if (inputElement) {
                inputElement.addEventListener('input', () => validateField(field.id, field.pattern, field.errorId));
            }
        });
    }

    setupValidation();

    // AJAX form submission
    document.getElementById('addAddressForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = [...document.querySelectorAll('input, select')];
        const isValid = inputs.every(input => {
            const pattern = regexPatterns[input.id];
            if (pattern) {
                return validateField(input.id, pattern, `${input.id}Error`);
            }
            return true; // Skip if pattern not found (i.e., no validation needed)
        });

        // Checking if the Address Type is selected
        const addressType = document.getElementById('addressType');
        if (addressType.value === '') {
            document.getElementById('addressTypeError').textContent = 'Please select an address type.';
            return;
        } else {
            document.getElementById('addressTypeError').textContent = '';
        }

        if (!isValid) {
            document.getElementById('backendMessage').textContent = 'Please correct the errors before submitting.';
            document.getElementById('backendMessage').style.color = 'red';
            return;
        }

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/myaccount/add-address', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('backendMessage').textContent = 'Address added successfully.';
                document.getElementById('backendMessage').style.color = 'green';
                setTimeout(() => {
                    window.location.href = '/myaccount/address-book';
                }, 1000); // Redirect after 2 seconds to allow user to see success message
                alert('Address added successfully.');
            } else {
                document.getElementById('backendMessage').textContent = result.message || 'Failed to add address.';
                document.getElementById('backendMessage').style.color = 'red';
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('backendMessage').textContent = 'An error occurred. Please try again later.';
            document.getElementById('backendMessage').style.color = 'red';
        }
    });
});
document.getElementById('pincode').addEventListener('input', async (e) => {
        const pincode = e.target.value;
        if (pincode.length === 6) {
    try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();

        if (data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0];
            const State = postOffice.State || '';
            const District = postOffice.District || '';
            const Country = postOffice.Country || '';
            const Block = postOffice.Block || ''; // Check if Block exists

            console.log(postOffice);

            document.getElementById('state').value = State;
            document.getElementById('district').value = District;
            document.getElementById('country').value = Country;
            document.getElementById('city').value = Block; // Use Block if available, else empty string
        } else {
            document.getElementById('state').value = '';
            document.getElementById('district').value = '';
            document.getElementById('country').value = '';
            document.getElementById('city').value = '';
        }
    } catch (error) {
        console.error('Error fetching pincode details:', error);
    }
}
});

document.addEventListener('DOMContentLoaded', (event) => {
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    let addressIdToDelete;

    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(button => {
        button.addEventListener('click', (event) => {
            addressIdToDelete = event.currentTarget.getAttribute('data-address-id');
        });
    });

    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (addressIdToDelete) {
            try {
                const response = await fetch(`/myaccount/delete-address/${addressIdToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    // Reload the page or update the UI to reflect the deletion
                    window.location.reload();
                } else {
                    console.error('Failed to delete address');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
        deleteModal.hide();
    });
});

document.getElementById('editPincode').addEventListener('input', async (e) => {
    const pincode = e.target.value;
    if (pincode.length === 6) {
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            const data = await response.json();
            if (data[0].Status === 'Success') {
                const postOffice = data[0].PostOffice[0];
                const State = postOffice.State || '';
                const District = postOffice.District || '';
                const Country = postOffice.Country || '';
                const Block = postOffice.Block || ''; // Check if Block exists
                console.log(postOffice);
                document.getElementById('editState').value = State;
                document.getElementById('editDistrict').value = District;
                document.getElementById('editCountry').value = Country;
                document.getElementById('editCity').value = Block; // Use Block if available, else empty string
            } else {
                document.getElementById('editState').value = '';
                document.getElementById('editDistrict').value = '';
                document.getElementById('editCountry').value = '';
                document.getElementById('editCity').value = '';
            }
        } catch (error) {
            console.error('Error fetching pincode details:', error);
        }
    }
});

document.getElementById('editAddressForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent form submission until validation is complete

    // Clear previous errors
    clearErrors();

    // Regular Expressions for validation
    const regexPatterns = {
        fullName: /^[A-Za-z]{1,}[A-Za-z\s]{0,}$/,
        mobileNo: /^(?!([0-9])\1{9})[6-9][0-9]{9}$/,
        address: /^[A-Za-z0-9\s,.-]{5,}$/,
        landmark: /^[A-Za-z0-9\s,.-]{3,}$/,
        pincode: /^[0-9]{6}$/,
        flatNo: /^[A-Za-z0-9\s-]{1,}$/, // Optional
        district: /^[A-Za-z\s]{2,}$/,
        state: /^[A-Za-z\s]{2,}$/,
        country: /^[A-Za-z\s]{2,}$/,
        city: /^[A-Za-z\s]{2,}$/
    };

    // Form field values
    const fullName = document.getElementById('editFullName').value.trim();
    const mobileNo = document.getElementById('editMobileNo').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const flatNo = document.getElementById('editFlatNo').value.trim();
    const landmark = document.getElementById('editLandmark').value.trim();
    const pincode = document.getElementById('editPincode').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const district = document.getElementById('editDistrict').value.trim();
    const state = document.getElementById('editState').value.trim();
    const country = document.getElementById('editCountry').value.trim();
    const addressId = document.getElementById('addressId').value.trim();
    const addressType = document.getElementById('editAddressType').value; 

    let isValid = true;

    // Validation function
    function validateField(regex, value, errorFieldId, errorMessage) {
        if (!regex.test(value)) {
            document.getElementById(errorFieldId).innerText = errorMessage;
            isValid = false;
        }
    }

    // Validate each field
    validateField(regexPatterns.fullName, fullName, 'editFullNameError', 'Please enter a valid full name.');
    validateField(regexPatterns.mobileNo, mobileNo, 'editMobileNoError', 'Please enter a valid 10-digit mobile number.');
    validateField(regexPatterns.address, address, 'editAddressError', 'Please enter a valid address.');

    // Optional fields
    if (flatNo && !regexPatterns.flatNo.test(flatNo)) {
        document.getElementById('editFlatNoError').innerText = 'Please enter a valid flat number.';
        isValid = false;
    }
    if (landmark && !regexPatterns.landmark.test(landmark)) {
        document.getElementById('editLandmarkError').innerText = 'Please enter a valid landmark.';
        isValid = false;
    }

    validateField(regexPatterns.pincode, pincode, 'editPincodeError', 'Please enter a valid 6-digit pincode.');
    validateField(regexPatterns.city, city, 'editCityError', 'Please enter a valid city name.');
    validateField(regexPatterns.district, district, 'editDistrictError', 'Please enter a valid district.');
    validateField(regexPatterns.state, state, 'editStateError', 'Please enter a valid state.');
    validateField(regexPatterns.country, country, 'editCountryError', 'Please enter a valid country.');

    // If all fields are valid, submit the form
    if (isValid) {
        try {
            const response = await fetch(`/myaccount/edit-address/${addressId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    FullName: fullName,
                    MobileNo: mobileNo,
                    Address: address,
                    Landmark: landmark,
                    Pincode: pincode,
                    FlatNo: flatNo,
                    AddressType: addressType,
                    District: district,
                    State: state,
                    Country: country,
                    City: city
                })
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('editServerError').textContent = 'Address added successfully.';
                document.getElementById('editServerError').style.color = 'green';
                setTimeout(() => {
                    window.location.href = '/myaccount/address-book';
                }, 1000);
                alert('Address updated successfully.');
                // Optionally, redirect or reset the form
            } else {
                // Display server-side validation errors
                document.getElementById('editServerError').innerText = result.message;
                document.getElementById('editServerError').style.color = 'red';
            }
        } catch (error) {
            console.error('Error updating address:', error);
            document.getElementById('editServerError').innerText = 'An error occurred while updating the address.';
            document.getElementById('editServerError').style.color = 'red';
        }
    }
});

function clearErrors() {
    document.getElementById('editFullNameError').innerText = '';
    document.getElementById('editMobileNoError').innerText = '';
    document.getElementById('editAddressError').innerText = '';
    document.getElementById('editFlatNoError').innerText = '';
    document.getElementById('editLandmarkError').innerText = '';
    document.getElementById('editPincodeError').innerText = '';
    document.getElementById('editCityError').innerText = '';
    document.getElementById('editDistrictError').innerText = '';
    document.getElementById('editStateError').innerText = '';
    document.getElementById('editCountryError').innerText = '';
    document.getElementById('editServerError').innerText = ''; // Server-side error message
}