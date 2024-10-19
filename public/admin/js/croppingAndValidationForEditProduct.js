let cropper;
let croppedImages = []; // To hold the cropped images
let uploadedImages = []; // To hold the uploaded images
let currentImageIndex; // To keep track of which image is being cropped

// Add this line to keep track if any image has been cropped
let isImageCropped = false;

// Modify the handleCropper function
function handleCropper(imageIndex, file) {
    if (typeof file === 'string') {  // Check if it's a URL
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

                // Enable the submit button when an existing image is cropped
                isImageCropped = true;
                document.getElementById('submitButton').disabled = false;
            });
    } else {
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

            // Enable the submit button when a new image is cropped
            isImageCropped = true;
            document.getElementById('submitButton').disabled = false;
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
            uploadedImages[imageIndex] = e.target.result; // Save uploaded image to the array
        };
        reader.readAsDataURL(file);
        
        document.getElementById(changeButtonId).style.display = 'block';

        document.getElementById(previewId).addEventListener('click', () => handleCropper(imageIndex, file));
    }
}

// Add event listeners for the file inputs and preview images
document.getElementById('productImages1').addEventListener('change', function() {
    previewImage(this, 'preview1', 0, 'changeImage1');
});

document.getElementById('productImages2').addEventListener('change', function() {
    previewImage(this, 'preview2', 1, 'changeImage2');
});

document.getElementById('productImages3').addEventListener('change', function() {
    previewImage(this, 'preview3', 2, 'changeImage3');
});

// Handle "Change Image" button clicks
document.getElementById('changeImage1').addEventListener('click', () => {
    document.getElementById('productImages1').click();
});
document.getElementById('changeImage2').addEventListener('click', () => {
    document.getElementById('productImages2').click();
});
document.getElementById('changeImage3').addEventListener('click', () => {
    document.getElementById('productImages3').click();
});

// Handle existing image clicks (Treat it as new for cropping)
document.getElementById('preview1').addEventListener('click', function() {
    const imgSrc = document.getElementById('preview1').src;
    handleCropper(0, imgSrc);
});
document.getElementById('preview2').addEventListener('click', function() {
    const imgSrc = document.getElementById('preview2').src;
    handleCropper(1, imgSrc);
});
document.getElementById('preview3').addEventListener('click', function() {
    const imgSrc = document.getElementById('preview3').src;
    handleCropper(2, imgSrc);
});

// Handle crop button click
// Handle crop button click
document.getElementById('cropButton').addEventListener('click', function() {
    if (cropper) {
        const croppedCanvas = cropper.getCroppedCanvas();
        const croppedImageURL = croppedCanvas.toDataURL('image/jpeg');

        // Update the preview with the cropped image
        document.getElementById(`preview${currentImageIndex + 1}`).src = croppedImageURL;

        // Save the cropped image, overwriting the previous one at the current index
        croppedImages[currentImageIndex] = croppedImageURL; // Keep only the last cropped image

        // Optionally, also clear the uploaded image at the index
        uploadedImages[currentImageIndex] = null; // Clear if you want to replace

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
    event.preventDefault();

    const formData = new FormData(this);

    // Add cropped images to FormData if they exist
    croppedImages.forEach((image, index) => {
        if (image) {
            const blob = dataURLtoBlob(image);
            formData.append(`croppedImage${index + 1}`, blob, `croppedImage${index + 1}.jpg`);
        } else if (uploadedImages[index]) {
            // Optionally add the uploaded image if no cropping occurred
            const blob = dataURLtoBlob(uploadedImages[index]);
            formData.append(`uploadedImage${index + 1}`, blob, `uploadedImage${index + 1}.jpg`);
        }
    });

    const productId = document.getElementById('productId').value;

    fetch(`/admin/products/edit/${productId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/admin/products';
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

    // Function to validate image files
    function validateImageFiles() {
        let valid = true;

        const imageInputs = [
            { inputId: 'productImages1', errorId: 'image1-error' },
            { inputId: 'productImages2', errorId: 'image2-error' },
            { inputId: 'productImages3', errorId: 'image3-error' },
        ];

        imageInputs.forEach(({ inputId, errorId }) => {
            const input = document.getElementById(inputId);
            const errorElement = document.getElementById(errorId);
            const files = input.files;

            // If files exist, check if they're images
            if (files.length > 0) {
                const validImage = Array.from(files).every(file => file.type.startsWith('image/'));
                if (!validImage) {
                    errorElement.textContent = 'Please upload a valid image file.';
                    errorElement.style.display = 'block';
                    valid = false;
                } else {
                    errorElement.style.display = 'none'; // Hide error message if valid
                }
            } else {
                errorElement.style.display = 'none'; // Hide error if no file uploaded
            }
        });

        return valid;
    }

    // Function to validate form fields
    function validateForm() {
        let valid = true;

        // Validate Name
        const name = document.getElementById('productName').value.trim();
        const nameError = document.getElementById('name-error');
        const nameRegex = /^(?!.*[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]{2})(?!.*\s{2,})[^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*(?:[\w\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~][^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*){2,85}$/;
        if (!nameRegex.test(name)) {
            nameError.textContent = 'Invalid Name';
            nameError.style.display = 'block';
            valid = false;
        } else {
            nameError.style.display = 'none';
        }

        // Validate Author
        const author = document.getElementById('productAuthor').value.trim();
        const authorError = document.getElementById('author-error');
        if (!nameRegex.test(author)) {
            authorError.textContent = 'Invalid Author Name';
            authorError.style.display = 'block';
            valid = false;
        } else {
            authorError.style.display = 'none';
        }

        // Validate Description
        const description = document.getElementById('productDescription').value.trim();
        const descriptionError = document.getElementById('description-error');
        const descriptionRegex = /^(?!.*[!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]{2})(?!.*\s{2,})[^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*(?:[\w\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~][^\s!@#$%^&*()_+=\[\]{};:'",.<>?\/\\|`~]*){25,250}$/;
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
        const priceRegex = /^\d+(\.\d{1,2})?$/;
        const priceIsValid = priceRegex.test(price) && parseFloat(price) > 0;
        if (!priceIsValid) {
            priceError.textContent = 'Invalid Price';
            priceError.style.display = 'block';
            valid = false;
        } else {
            priceError.style.display = 'none';
        }

        // Validate image files
        const imagesValid = validateImageFiles();
        valid = valid && imagesValid;

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