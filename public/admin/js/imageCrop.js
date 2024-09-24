let cropper;
let croppedImages = []; // Initialize the croppedImages array globally
let currentImageIndex; // To track which image is being cropped

function handleCropper(imageIndex, file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = document.getElementById('cropperImage');
        image.src = e.target.result;

        // Initialize Cropper
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1
        });

        // Set the current image index
        currentImageIndex = imageIndex;
        document.getElementById('cropperContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Preview and image selection handling
document.getElementById('preview1').addEventListener('click', () => {
    if (!document.getElementById('changeImage1').style.display) {
        document.getElementById('productImages1').click();
    }
});
document.getElementById('preview2').addEventListener('click', () => {
    if (!document.getElementById('changeImage2').style.display) {
        document.getElementById('productImages2').click();
    }
});
document.getElementById('preview3').addEventListener('click', () => {
    if (!document.getElementById('changeImage3').style.display) {
        document.getElementById('productImages3').click();
    }
});

function previewImage(input, previewId, imageIndex, changeButtonId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Show "Change Image" button and disable image click
        document.getElementById(changeButtonId).style.display = 'block';
        document.getElementById(previewId).removeEventListener('click', () => document.getElementById(`productImages${imageIndex}`).click());

        // Enable cropping by clicking on the preview image
        document.getElementById(previewId).addEventListener('click', () => handleCropper(imageIndex, file));
    }
}

document.getElementById('productImages1').addEventListener('change', function() {
    previewImage(this, 'preview1', 0, 'changeImage1');
});

document.getElementById('productImages2').addEventListener('change', function() {
    previewImage(this, 'preview2', 1, 'changeImage2');
});

document.getElementById('productImages3').addEventListener('change', function() {
    previewImage(this, 'preview3', 2, 'changeImage3');
});

// Handle "Change Image" button click
document.getElementById('changeImage1').addEventListener('click', () => {
    document.getElementById('productImages1').click();
});
document.getElementById('changeImage2').addEventListener('click', () => {
    document.getElementById('productImages2').click();
});
document.getElementById('changeImage3').addEventListener('click', () => {
    document.getElementById('productImages3').click();
});

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

document.getElementById('cancelCropButton').addEventListener('click', function() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('cropperContainer').style.display = 'none';
});

document.getElementById('addProductForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const formData = new FormData(this);

    // Add cropped images to FormData
    croppedImages.forEach((croppedImage, index) => {
        if (croppedImage) {
            const blob = dataURLtoBlob(croppedImage);
            formData.append(`croppedImage${index}`, blob, `croppedImage${index}.jpg`);
        }
    });
    console.log('FormData contents:', Array.from(formData.entries()));
    console.log('Cropped Images:', croppedImages);
    fetch('/admin/products/add', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/admin/products'; // Redirect on success
        } else {
            const errorElement = document.getElementById('existingError');
            errorElement.innerHTML = data.message; // Set the error message
            errorElement.style.display = 'block'; // Show the error element
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const errorElement = document.getElementById('existingError');
        errorElement.innerHTML = 'Something went wrong. Please try again.';
        errorElement.style.display = 'block';
    });
});

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

        // Validate Images
        const img1Input = document.getElementById('productImages1');
        const img2Input = document.getElementById('productImages2');
        const img3Input = document.getElementById('productImages3');
        const imageError = document.getElementById('image-error');
        
        // Check if each input has at least one file uploaded
        if (img1Input.files.length === 0 || img2Input.files.length === 0 || img3Input.files.length === 0) {
            imageError.textContent = 'Three images must be uploaded.';
            imageError.style.display = 'block';
            valid = false;
        } else {
             // Function to validate if the file is an image
            function isImage(file) {
                return file.type.startsWith('image/');
            }

            // Validate each image input
            const files = [img1Input.files[0], img2Input.files[0], img3Input.files[0]];
            for (let i = 0; i < files.length; i++) {
                if (!isImage(files[i])) {
                    imageError.textContent = `File ${i + 1} is not a valid image. Please upload a valid image file.`;
                    imageError.style.display = 'block';
                    valid = false;
                    break; // Stop validation after finding an invalid file
                }
            }
        
            // If all files are valid images, hide the error message
            if (valid) {
                imageError.style.display = 'none';
            }
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