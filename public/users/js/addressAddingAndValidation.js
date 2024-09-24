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
                }, 1000); // Redirect after 1 seconds to allow user to see success message
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

// Listen for input changes on the pincode field
document.querySelectorAll('[id^=editPincode-]').forEach(input => {
    input.addEventListener('input', async (e) => {
        const pincode = e.target.value;
        const formId = e.target.id.split('-')[1]; // Extract address ID from input ID
        const formPrefix = `#editModal-${formId}`;

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
                    document.querySelector(`${formPrefix} #editState-${formId}`).value = State;
                    document.querySelector(`${formPrefix} #editDistrict-${formId}`).value = District;
                    document.querySelector(`${formPrefix} #editCountry-${formId}`).value = Country;
                    document.querySelector(`${formPrefix} #editCity-${formId}`).value = Block; // Use Block if available
                } else {
                    // Clear fields if pincode is not found
                    document.querySelector(`${formPrefix} #editState-${formId}`).value = '';
                    document.querySelector(`${formPrefix} #editDistrict-${formId}`).value = '';
                    document.querySelector(`${formPrefix} #editCountry-${formId}`).value = '';
                    document.querySelector(`${formPrefix} #editCity-${formId}`).value = '';
                }
            } catch (error) {
                console.error('Error fetching pincode details:', error);
            }
        }
    });
});

// Listen for form submission
document.querySelectorAll('[id^=editAddressForm-]').forEach(form => {
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formId = form.id.split('-')[1]; // Extract the address ID
        const formPrefix = `#editModal-${formId}`;

        // Clear previous errors
        clearErrors(formId);

        // Regular Expressions for validation
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

        // Get field values using the unique IDs
        const fullName = document.querySelector(`${formPrefix} #editFullName-${formId}`).value.trim();
        const mobileNo = document.querySelector(`${formPrefix} #editMobileNo-${formId}`).value.trim();
        const address = document.querySelector(`${formPrefix} #editAddress-${formId}`).value.trim();
        const flatNo = document.querySelector(`${formPrefix} #editFlatNo-${formId}`).value.trim();
        const landmark = document.querySelector(`${formPrefix} #editLandmark-${formId}`).value.trim();
        const pincode = document.querySelector(`${formPrefix} #editPincode-${formId}`).value.trim();
        const city = document.querySelector(`${formPrefix} #editCity-${formId}`).value.trim();
        const district = document.querySelector(`${formPrefix} #editDistrict-${formId}`).value.trim();
        const state = document.querySelector(`${formPrefix} #editState-${formId}`).value.trim();
        const country = document.querySelector(`${formPrefix} #editCountry-${formId}`).value.trim();
        const addressType = document.querySelector(`${formPrefix} #editAddressType-${formId}`).value;

        let isValid = true;

        // Validation function
        function validateField(regex, value, errorFieldId, errorMessage) {
            if (!regex.test(value)) {
                document.getElementById(`${errorFieldId}-${formId}`).innerText = errorMessage;
                isValid = false;
            }
        }

        // Validate fields
        validateField(regexPatterns.fullName, fullName, 'editFullNameError', 'Please enter a valid full name.');
        validateField(regexPatterns.mobileNo, mobileNo, 'editMobileNoError', 'Please enter a valid 10-digit mobile number.');
        validateField(regexPatterns.address, address, 'editAddressError', 'Please enter a valid address.');

        // Optional fields validation
        if (flatNo && !regexPatterns.flatNo.test(flatNo)) {
            document.getElementById(`editFlatNoError-${formId}`).innerText = 'Please enter a valid flat number.';
            isValid = false;
        }
        if (landmark && !regexPatterns.landmark.test(landmark)) {
            document.getElementById(`editLandmarkError-${formId}`).innerText = 'Please enter a valid landmark.';
            isValid = false;
        }

        validateField(regexPatterns.pincode, pincode, 'editPincodeError', 'Please enter a valid 6-digit pincode.');
        validateField(regexPatterns.city, city, 'editCityError', 'Please enter a valid city name.');
        validateField(regexPatterns.district, district, 'editDistrictError', 'Please enter a valid district.');
        validateField(regexPatterns.state, state, 'editStateError', 'Please enter a valid state.');
        validateField(regexPatterns.country, country, 'editCountryError', 'Please enter a valid country.');

        // If validation is successful, submit form
        if (isValid) {
            try {
                const response = await fetch(`/myaccount/edit-address/${formId}`, {
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
        
                const serverErrorElement = document.getElementById(`editServerError-${formId}`);
                
                if (response.ok) {
                    // Show success message
                    serverErrorElement.textContent = 'Address updated successfully';
                    serverErrorElement.style.color = 'green';
        
                    setTimeout(() => {
                        window.location.href = '/myaccount/address-book'; // Redirect after 1 second
                    }, 1000);
                } else {
                    // Show server error message from response
                    serverErrorElement.textContent = result.message;
                    serverErrorElement.style.color = 'red';
                }
            } catch (error) {
                // Handle any errors during the request
                console.error('Error updating address:', error);
                document.getElementById(`editServerError-${formId}`).textContent = 'An error occurred while updating the address.';
                document.getElementById(`editServerError-${formId}`).style.color = 'red';
            }
        } else {
            // Show a message if validation fails (for example, on invalid form fields)
            const serverErrorElement = document.getElementById(`editServerError-${formId}`);
            serverErrorElement.textContent = 'Please fill out all required fields correctly.';
            serverErrorElement.style.color = 'red';
        }


    });
});

// Function to clear previous errors
function clearErrors(formId) {
    document.querySelectorAll(`#editModal-${formId} .text-danger`).forEach(el => {
        el.innerText = ''; // Clear error messages
    });
}