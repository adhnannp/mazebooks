let cropper;
let croppedImages = []; // To hold the cropped images
let currentImageIndex; // To keep track of which image is being cropped

function handleCropper(imageIndex, file) {
    if (typeof file === 'string') {  // Check if it's a URL
        // Fetch the image from the URL and convert it to a Blob
        fetch(file)
            .then(response => response.blob())
            .then(blob => {
                const image = document.getElementById('cropperImage');
                const url = URL.createObjectURL(blob);
                image.src = url;

                if (cropper) cropper.destroy();
                cropper = new Cropper(image, {
                    aspectRatio: 1,
                    viewMode: 1,
                    autoCropArea: 1
                });

                currentImageIndex = imageIndex;
                document.getElementById('cropperContainer').style.display = 'block';
            });
    } else {
        // If it's a new file, proceed as normal
        const reader = new FileReader();
        reader.onload = function(e) {
            const image = document.getElementById('cropperImage');
            image.src = e.target.result;

            if (cropper) cropper.destroy();
            cropper = new Cropper(image, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1
            });

            currentImageIndex = imageIndex;
            document.getElementById('cropperContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function previewImage(input, previewId, imageIndex, changeButtonId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Show the "Change Image" button
        document.getElementById(changeButtonId).style.display = 'block';

        // Enable cropping by clicking on the preview image
        document.getElementById(previewId).addEventListener('click', () => handleCropper(imageIndex, file));
    }
}

// Add event listeners for the file inputs and preview images
document.getElementById('productImages1').addEventListener('change', function() {
    previewImage(this, 'preview1', 0, 'changeImage1');
});

// Handle "Change Image" button click
document.getElementById('changeImage1').addEventListener('click', () => {
    document.getElementById('productImages1').click();
});

// Handle existing image click (Treat it as new for cropping)
document.getElementById('preview1').addEventListener('click', function() {
    // When clicking on an already existing image, allow cropping as if it's a new image
    const imgSrc = document.getElementById('preview1').src;
    handleCropper(0, imgSrc);  // Image index is 0 for the first image
});

// Handle crop button click
document.getElementById('cropButton').addEventListener('click', function() {
    if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageURL = croppedCanvas.toDataURL('image/jpeg');

        // Update the preview with the cropped image
        document.getElementById(`preview${currentImageIndex + 1}`).src = croppedImageURL;

        // Save cropped image
        croppedImages[currentImageIndex] = croppedImageURL;

        // Hide the cropping section
        document.getElementById('cropperContainer').style.display = 'none';
    }
});

// Cancel cropping
document.getElementById('cancelCropButton').addEventListener('click', function() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('cropperContainer').style.display = 'none';
});

// Convert dataURL to Blob for uploading
function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// Form submission handling
document.getElementById('addProductForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const formData = new FormData(this);

    // Add cropped image to FormData if it exists
    if (croppedImages.length > 0 && croppedImages[0]) { // Check if there are cropped images
        const blob = dataURLtoBlob(croppedImages[0]);
        formData.append('croppedImage', blob, 'croppedImage.jpg');
    }

    const productId = document.getElementById('productId').value;
    console.log('Product ID:', productId);
    console.log(`/admin/products/edit/${productId}`);

    fetch(`/admin/products/edit/${productId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/admin/products'; // Redirect on success
        } else {
            const errorElement = document.getElementById('existingError');
            errorElement.innerHTML = data.message;
            errorElement.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const errorElement = document.getElementById('existingError');
        errorElement.innerHTML = 'Something went wrong. Please try again.';
        errorElement.style.display = 'block';
    });
});


//validation
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const submitButton = document.getElementById('submitButton');
    
    // Function to validate form fields
    function validateForm() {
        let valid = true;

        // Validate Name
        const name = document.getElementById('productName').value.trim();
        const nameError = document.getElementById('name-error');
        const nameRegex =   /^(?!.*[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]{2})(?!.*\s{2,})[^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*(?:[\w\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~][^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*){2,85}$/;
        if (!nameRegex.test(name)) {
            nameError.textContent = 'invalid Name';
            nameError.style.display = 'block';
            valid = false;
        } else {
            nameError.style.display = 'none';
        }

        // Validate Author
        const author = document.getElementById('productAuthor').value.trim();
        const authorError = document.getElementById('author-error');
        if (!nameRegex.test(author)) {
            authorError.textContent = 'invalid Author Name';
            authorError.style.display = 'block';
            valid = false;
        } else {
            authorError.style.display = 'none';
        }

        // Validate Description
        const description = document.getElementById('productDescription').value.trim();
        const descriptionError = document.getElementById('description-error');
        const descriptionRegex =  /^(?!.*[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]{2})(?!.*\s{2,})[^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*(?:[\w\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~][^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*){25,250}$/;
        if (!descriptionRegex.test(description)) {
            descriptionError.textContent = 'Invalid Description';
            descriptionError.style.display = 'block';
            valid = false;
        } else {
            descriptionError.style.display = 'none';
        }

       // Validate Quantity
        const quantity = document.getElementById('productQuantity').value;
        const quantityError = document.getElementById('quantity-error');

        // Check if the quantity is a positive number or zero and is an integer
        const quantityIsValid = /^[0-9]+$/.test(quantity);

        if (!quantityIsValid || quantity < 0) {
            quantityError.textContent = 'Invalid Quantity';
            quantityError.style.display = 'block';
            valid = false;
        } else {
            quantityError.style.display = 'none';
        }

       // Validate Price
        const price = document.getElementById('productPrice').value;
        const priceError = document.getElementById('price-error');

        // Regular expression for positive floating-point numbers with up to two decimal places
        const priceRegex = /^\d+(\.\d{1,2})?$/;

        // Check if the price is a valid floating-point number with up to two decimal places and non-negative
        const priceIsValid = priceRegex.test(price) && parseFloat(price) >= 0;

        if (!priceIsValid) {
            priceError.textContent = 'Invalid Price';
            priceError.style.display = 'block';
            valid = false;
        } else {
            priceError.style.display = 'none';
        }

        // Enable or disable submit button
        submitButton.disabled = !valid;

        return valid;
    }

    // Attach event listeners to form fields
    form.addEventListener('input', validateForm);
    form.addEventListener('change', validateForm);

    // Optionally, you can also call validateForm on form submission
    form.addEventListener('submit', (event) => {
        if (!validateForm()) {
            event.preventDefault(); // Prevent form submission if validation fails
        }
    });
});